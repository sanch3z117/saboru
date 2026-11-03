import {
  listPending,
  markPending,
  markRejected,
  markRetry,
  markSending,
  removeOutboxItems,
  resetOrphanSending,
} from "@/lib/offline/outbox";

export type SyncResultItem = {
  clientId: string;
  status: "ok" | "duplicate" | "rejected";
  code?: string;
};

export type SyncOutcome = {
  status: "ok" | "empty" | "offline" | "unauthorized" | "error";
  sent?: number;
  rejected?: number;
  rejectedCode?: string;
};

export function backoffDelayMs(attempts: number) {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempts));
}

/**
 * Envía un lote de hasta 20 operaciones del usuario actual. No lanza:
 * red/5xx dejan la cola pendiente, 401 la conserva sin contar intento y
 * `rejected` se marca para no reintentarse.
 */
export async function syncOutbox(
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SyncOutcome> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { status: "offline" };
  }

  await resetOrphanSending();

  const pending = (await listPending(userId)).slice(0, 20);
  if (pending.length === 0) {
    return { status: "empty" };
  }

  await markSending(pending.map((item) => item.clientId));

  let response: Response;
  try {
    response = await fetchImpl("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operations: pending.map(({ type, clientId, payload }) => ({
          type,
          clientId,
          payload,
        })),
      }),
    });
  } catch {
    await Promise.all(pending.map((item) => markRetry(item.clientId)));
    return { status: "error" };
  }

  if (response.status === 401) {
    await markPending(pending.map((item) => item.clientId));
    return { status: "unauthorized" };
  }

  if (!response.ok) {
    await Promise.all(pending.map((item) => markRetry(item.clientId)));
    return { status: "error" };
  }

  const data = (await response.json().catch(() => null)) as {
    results?: SyncResultItem[];
  } | null;

  if (!Array.isArray(data?.results)) {
    await markPending(pending.map((item) => item.clientId));
    return { status: "error" };
  }

  const byId = new Map(data.results.map((result) => [result.clientId, result]));
  let sent = 0;
  let rejected = 0;
  let rejectedCode: string | undefined;

  for (const item of pending) {
    const result = byId.get(item.clientId);

    if (!result) {
      await markRetry(item.clientId);
      continue;
    }

    if (result.status === "rejected") {
      await markRejected(item.clientId, result.code ?? "invalid");
      rejected += 1;
      rejectedCode ??= result.code ?? "invalid";
    } else {
      await removeOutboxItems([item.clientId]);
      sent += 1;
    }
  }

  return { status: "ok", sent, rejected, rejectedCode };
}
