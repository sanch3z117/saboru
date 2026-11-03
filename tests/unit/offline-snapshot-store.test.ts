import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openOfflineDb } from "@/lib/offline/db";
import {
  readSnapshot,
  refreshSnapshot,
  saveSnapshot,
  type SnapshotDeps,
  type SnapshotStore,
} from "@/lib/offline/snapshot-store";
import type { CatalogSnapshot } from "@/types/catalog";

function makeSnapshot(version = "v1"): CatalogSnapshot {
  return {
    version,
    generated_at: "2026-11-03T12:00:00.000Z",
    blocks: [],
    establishments: [],
    products: [],
    product_stats: [],
    reviews: [],
  };
}

function makeRefreshDeps(options: {
  record?: CatalogSnapshot;
  fetch?: SnapshotDeps["fetch"];
  put?: (record: { savedAt: number }) => Promise<unknown>;
  now?: number;
}) {
  let saved =
    options.record === undefined
      ? undefined
      : {
          id: "catalog" as const,
          snapshot: options.record,
          savedAt: 1,
        };

  const put = vi.fn(
    async (record: { savedAt: number; snapshot: CatalogSnapshot }) => {
      if (options.put) {
        await options.put(record);
      }
      saved = {
        id: "catalog",
        snapshot: record.snapshot,
        savedAt: record.savedAt,
      };
    },
  );

  const store: SnapshotStore = {
    get: async () => saved,
    put,
    close: () => undefined,
  };

  const deps: SnapshotDeps = {
    open: async () => store,
    fetch:
      options.fetch ??
      (async () =>
        new Response(JSON.stringify(makeSnapshot("v2")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })),
    now: () => options.now ?? 1000,
  };

  return { deps, put, getSaved: () => saved };
}

beforeEach(async () => {
  const db = await openOfflineDb();
  await db.clear("snapshot");
  db.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("store del snapshot", () => {
  it("guarda y lee el snapshot con id catalog", async () => {
    const snapshot = makeSnapshot();
    expect(await saveSnapshot(snapshot)).toEqual({ ok: true });

    const stored = await readSnapshot();
    expect(stored.ok).toBe(true);
    if (stored.ok) {
      expect(stored.record.id).toBe("catalog");
      expect(stored.record.snapshot.version).toBe("v1");
      expect(stored.record.savedAt).toBeGreaterThan(0);
    }
  });

  it("devuelve empty sin registro y corrupt con datos inválidos", async () => {
    expect(await readSnapshot()).toEqual({ ok: false, reason: "empty" });

    const db = await openOfflineDb();
    await db.put("snapshot", {
      id: "catalog",
      snapshot: { version: "v1" } as unknown as CatalogSnapshot,
      savedAt: 1,
    });
    db.close();

    expect(await readSnapshot()).toEqual({ ok: false, reason: "corrupt" });
  });
});

describe("refreshSnapshot", () => {
  it("no reescribe si la versión no cambió", async () => {
    const { deps, put } = makeRefreshDeps({
      record: makeSnapshot("v1"),
      fetch: async () =>
        new Response(JSON.stringify(makeSnapshot("v1")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });

    const result = await refreshSnapshot(deps);

    expect(result).toMatchObject({ ok: true, updated: false });
    expect(put).not.toHaveBeenCalled();
  });

  it("guarda cuando la versión cambia", async () => {
    const { deps, put, getSaved } = makeRefreshDeps({
      record: makeSnapshot("v1"),
      fetch: async () =>
        new Response(JSON.stringify(makeSnapshot("v2")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });

    const result = await refreshSnapshot(deps);

    expect(result).toMatchObject({ ok: true, updated: true });
    expect(put).toHaveBeenCalledTimes(1);
    expect(getSaved()?.snapshot.version).toBe("v2");
    expect(getSaved()?.savedAt).toBe(1000);
  });

  it("maneja error de red sin lanzar y conserva el snapshot", async () => {
    const { deps, getSaved } = makeRefreshDeps({
      record: makeSnapshot("v1"),
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });

    const result = await refreshSnapshot(deps);

    expect(result).toEqual({ ok: false, reason: "network" });
    expect(getSaved()?.snapshot.version).toBe("v1");
  });

  it("maneja HTTP no-OK sin lanzar y conserva el snapshot", async () => {
    const { deps, getSaved } = makeRefreshDeps({
      record: makeSnapshot("v1"),
      fetch: async () => new Response("boom", { status: 500 }),
    });

    const result = await refreshSnapshot(deps);

    expect(result).toEqual({ ok: false, reason: "http", status: 500 });
    expect(getSaved()?.snapshot.version).toBe("v1");
  });

  it("rechaza JSON inválido o con forma incorrecta", async () => {
    const invalidJson = makeRefreshDeps({
      record: makeSnapshot("v1"),
      fetch: async () => new Response("no-json", { status: 200 }),
    });
    expect(await refreshSnapshot(invalidJson.deps)).toEqual({
      ok: false,
      reason: "invalid",
    });

    const invalidShape = makeRefreshDeps({
      record: makeSnapshot("v1"),
      fetch: async () =>
        new Response(JSON.stringify({ version: "v2" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });
    expect(await refreshSnapshot(invalidShape.deps)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("devuelve quota y conserva el snapshot anterior", async () => {
    const { deps, getSaved } = makeRefreshDeps({
      record: makeSnapshot("v1"),
      fetch: async () =>
        new Response(JSON.stringify(makeSnapshot("v2")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      put: async () => {
        throw new DOMException("lleno", "QuotaExceededError");
      },
    });

    const result = await refreshSnapshot(deps);

    expect(result).toEqual({ ok: false, reason: "quota" });
    expect(getSaved()?.snapshot.version).toBe("v1");
  });
});
