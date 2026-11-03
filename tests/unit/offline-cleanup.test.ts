import "fake-indexeddb/auto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cleanupLocalUserData,
  countPendingOutbox,
  isPrivateCacheName,
} from "@/lib/offline/cleanup";
import { openOfflineDb } from "@/lib/offline/db";
import type { CatalogSnapshot } from "@/types/catalog";

const snapshot: CatalogSnapshot = {
  version: "v1",
  generated_at: "2026-11-03T00:00:00.000Z",
  blocks: [],
  establishments: [],
  products: [],
  product_stats: [],
  reviews: [],
};

async function seed() {
  const db = await openOfflineDb();
  await Promise.all([
    db.clear("outbox"),
    db.clear("favorites"),
    db.clear("snapshot"),
  ]);

  await db.put("snapshot", { id: "catalog", snapshot, savedAt: 1 });
  await db.put("outbox", {
    clientId: "p1",
    userId: "u1",
    type: "review",
    payload: {},
    status: "pending",
    attempts: 0,
    createdAt: 1,
  });
  await db.put("outbox", {
    clientId: "p2",
    userId: "u1",
    type: "favorite",
    payload: {},
    status: "sending",
    attempts: 1,
    createdAt: 2,
  });
  await db.put("outbox", {
    clientId: "p3",
    userId: "u1",
    type: "report",
    payload: {},
    status: "rejected",
    attempts: 1,
    createdAt: 3,
  });
  await db.put("favorites", {
    id: "f1",
    userId: "u1",
    establishmentId: "e1",
    productId: null,
    createdAt: 1,
  });

  db.close();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("limpieza de datos privados al cerrar sesión", () => {
  it("borra outbox y favoritos, conserva el snapshot y limpia cachés privadas", async () => {
    await seed();

    const deleted: string[] = [];
    vi.stubGlobal("caches", {
      keys: async () => [
        "pages",
        "pages-rsc",
        "others",
        "apis",
        "next-data",
        "public-images",
        "serwist-precache-v2-http://localhost:3000/",
        "static-image-assets",
      ],
      delete: async (name: string) => {
        deleted.push(name);
        return true;
      },
    });

    expect(await countPendingOutbox()).toBe(2);

    const result = await cleanupLocalUserData();
    expect(result.pendingRemoved).toBe(2);

    expect(deleted.sort()).toEqual([
      "apis",
      "next-data",
      "others",
      "pages",
      "pages-rsc",
    ]);

    const db = await openOfflineDb();
    expect(await db.count("outbox")).toBe(0);
    expect(await db.count("favorites")).toBe(0);
    expect(await db.count("snapshot")).toBe(1);
    db.close();
  });

  it("es idempotente y no falla sin datos", async () => {
    await cleanupLocalUserData();
    const again = await cleanupLocalUserData();

    expect(again.pendingRemoved).toBe(0);
    expect(await countPendingOutbox()).toBe(0);
  });

  it("reconoce solo cachés privadas", () => {
    expect(isPrivateCacheName("pages")).toBe(true);
    expect(isPrivateCacheName("pages-rsc-prefetch")).toBe(true);
    expect(isPrivateCacheName("public-images")).toBe(false);
    expect(isPrivateCacheName("serwist-precache-v2-x")).toBe(false);
  });
});
