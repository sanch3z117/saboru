import { z } from "zod";

import { openOfflineDb, type SnapshotRecord } from "@/lib/offline/db";
import type { CatalogSnapshot } from "@/types/catalog";

export type SnapshotReadResult =
  | { ok: true; record: SnapshotRecord }
  | { ok: false; reason: "empty" | "corrupt" };

export type SnapshotWriteResult =
  { ok: true } | { ok: false; reason: "quota" | "error" };

export type SnapshotRefreshResult =
  | { ok: true; updated: boolean; snapshot: CatalogSnapshot }
  | {
      ok: false;
      reason: "network" | "http" | "invalid" | "quota" | "error";
      status?: number;
    };

type SnapshotStore = {
  get(key: "catalog"): Promise<SnapshotRecord | undefined>;
  put(record: SnapshotRecord): Promise<unknown>;
  close(): void;
};

export type { SnapshotStore };

export type SnapshotDeps = {
  open: () => Promise<SnapshotStore>;
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  now: () => number;
};

const snapshotSchema = z.object({
  version: z.string().min(1),
  generated_at: z.string().min(1),
  blocks: z.array(z.unknown()),
  establishments: z.array(z.unknown()),
  products: z.array(z.unknown()),
  product_stats: z.array(z.unknown()),
  reviews: z.array(z.unknown()),
});

async function openSnapshotStore(): Promise<SnapshotStore> {
  const db = await openOfflineDb();
  return {
    get: (key) => db.get("snapshot", key),
    put: (record) => db.put("snapshot", record),
    close: () => db.close(),
  };
}

function defaultDeps(): SnapshotDeps {
  return {
    open: openSnapshotStore,
    fetch: (input, init) => fetch(input, init),
    now: () => Date.now(),
  };
}

function isQuotaError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "QuotaExceededError"
  );
}

export async function readSnapshot(
  deps: SnapshotDeps = defaultDeps(),
): Promise<SnapshotReadResult> {
  const store = await deps.open();
  try {
    const record = await store.get("catalog");
    if (!record) {
      return { ok: false, reason: "empty" };
    }

    const parsed = snapshotSchema.safeParse(record.snapshot);
    if (!parsed.success) {
      return { ok: false, reason: "corrupt" };
    }

    return {
      ok: true,
      record: {
        ...record,
        snapshot: parsed.data as CatalogSnapshot,
      },
    };
  } finally {
    store.close();
  }
}

export async function saveSnapshot(
  snapshot: CatalogSnapshot,
  deps: SnapshotDeps = defaultDeps(),
): Promise<SnapshotWriteResult> {
  try {
    const store = await deps.open();
    try {
      await store.put({ id: "catalog", snapshot, savedAt: deps.now() });
    } finally {
      store.close();
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "error" };
  }
}

/**
 * Descarga el snapshot y lo guarda solo si cambió la versión. Nunca lanza:
 * red, HTTP no-OK, JSON inválido o cuota devuelven un resultado y se conserva
 * el snapshot anterior.
 */
export async function refreshSnapshot(
  deps: SnapshotDeps = defaultDeps(),
): Promise<SnapshotRefreshResult> {
  let response: Response;
  try {
    response = await deps.fetch("/api/catalog/snapshot", {
      cache: "no-store",
      credentials: "omit",
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (!response.ok) {
    return { ok: false, reason: "http", status: response.status };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const parsed = snapshotSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const snapshot = parsed.data as CatalogSnapshot;

  let current: SnapshotReadResult | null = null;
  try {
    current = await readSnapshot(deps);
  } catch {
    current = null;
  }

  if (current?.ok && current.record.snapshot.version === snapshot.version) {
    return { ok: true, updated: false, snapshot };
  }

  const saved = await saveSnapshot(snapshot, deps);
  if (!saved.ok) {
    return { ok: false, reason: saved.reason };
  }

  return { ok: true, updated: true, snapshot };
}
