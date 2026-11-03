import {
  openOfflineDb,
  type OutboxItem,
  type OutboxStatus,
  type OutboxType,
} from "@/lib/offline/db";
import { syncOperationSchema } from "@/lib/validations/sync";

export type EnqueueResult =
  | { ok: true; item: OutboxItem }
  | { ok: false; reason: "invalid" | "quota" | "error" };

function isQuotaError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "QuotaExceededError"
  );
}

/**
 * Valida el payload con el esquema de `/api/sync` antes de guardarlo. La reseña
 * y el reporte reciben el `clientId` de la operación (idempotencia).
 */
export async function enqueueOperation(input: {
  userId: string;
  type: OutboxType;
  payload: unknown;
}): Promise<EnqueueResult> {
  const clientId = crypto.randomUUID();
  const payload =
    input.type === "favorite"
      ? input.payload
      : { ...(input.payload as Record<string, unknown>), clientId };

  const parsed = syncOperationSchema.safeParse({
    type: input.type,
    clientId,
    payload,
  });

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const item: OutboxItem = {
    clientId,
    userId: input.userId,
    type: input.type,
    payload: parsed.data.payload,
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
  };

  try {
    const db = await openOfflineDb();
    try {
      await db.put("outbox", item);
    } finally {
      db.close();
    }
    return { ok: true, item };
  } catch (error) {
    return {
      ok: false,
      reason: isQuotaError(error) ? "quota" : "error",
    };
  }
}

export async function listOutbox(userId: string): Promise<OutboxItem[]> {
  const db = await openOfflineDb();
  try {
    return await db.getAllFromIndex("outbox", "by-user", userId);
  } finally {
    db.close();
  }
}

export async function listPending(userId: string): Promise<OutboxItem[]> {
  const items = await listOutbox(userId);
  return items
    .filter((item) => item.status === "pending")
    .sort(
      (a, b) =>
        a.createdAt - b.createdAt || a.clientId.localeCompare(b.clientId),
    );
}

export async function countOutbox(userId: string) {
  const items = await listOutbox(userId);
  const rejected = items.filter((item) => item.status === "rejected");

  return {
    pending: items.filter((item) => item.status === "pending").length,
    rejected: rejected.length,
    rejectedCode: rejected[0]?.errorCode ?? null,
  };
}

export async function markSending(clientIds: string[]) {
  await updateItems(clientIds, (item) => ({ ...item, status: "sending" }));
}

/** Vuelve a `pending` sin contar intento (sesión vencida o respuesta inválida). */
export async function markPending(clientIds: string[]) {
  await updateItems(clientIds, (item) => ({
    ...item,
    status: "pending" as OutboxStatus,
  }));
}

export async function markRetry(clientId: string) {
  await updateItems([clientId], (item) => ({
    ...item,
    status: "pending" as OutboxStatus,
    attempts: item.attempts + 1,
  }));
}

export async function markRejected(clientId: string, errorCode: string) {
  await updateItems([clientId], (item) => ({
    ...item,
    status: "rejected" as OutboxStatus,
    errorCode,
  }));
}

export async function removeOutboxItems(clientIds: string[]) {
  if (clientIds.length === 0) return;
  const db = await openOfflineDb();
  try {
    const tx = db.transaction("outbox", "readwrite");
    await Promise.all(clientIds.map((clientId) => tx.store.delete(clientId)));
    await tx.done;
  } finally {
    db.close();
  }
}

/** Un `sending` huérfano (app cerrada a mitad) vuelve a `pending` al abrir. */
export async function resetOrphanSending() {
  const db = await openOfflineDb();
  try {
    const tx = db.transaction("outbox", "readwrite");
    const items = await tx.store.getAll();
    for (const item of items) {
      if (item.status === "sending") {
        await tx.store.put({ ...item, status: "pending" });
      }
    }
    await tx.done;
  } finally {
    db.close();
  }
}

async function updateItems(
  clientIds: string[],
  update: (item: OutboxItem) => OutboxItem,
) {
  if (clientIds.length === 0) return;
  const db = await openOfflineDb();
  try {
    const tx = db.transaction("outbox", "readwrite");
    for (const clientId of clientIds) {
      const item = await tx.store.get(clientId);
      if (item) {
        await tx.store.put(update(item));
      }
    }
    await tx.done;
  } finally {
    db.close();
  }
}
