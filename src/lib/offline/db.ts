import { openDB, type IDBPDatabase } from "idb";

import type { CatalogSnapshot } from "@/types/catalog";

export const OFFLINE_DB_NAME = "saboru-offline";
export const OFFLINE_DB_VERSION = 1;

export type OutboxType = "review" | "favorite" | "report";
export type OutboxStatus = "pending" | "sending" | "rejected";

export type OutboxItem = {
  clientId: string;
  userId: string;
  type: OutboxType;
  payload: unknown;
  status: OutboxStatus;
  errorCode?: string;
  attempts: number;
  createdAt: number;
};

export type FavoriteRecord = {
  id: string;
  userId: string;
  establishmentId: string;
  productId: string | null;
  createdAt: number;
};

export type SnapshotRecord = {
  id: "catalog";
  snapshot: CatalogSnapshot;
  savedAt: number;
};

type OfflineSchema = {
  snapshot: { key: string; value: SnapshotRecord };
  outbox: {
    key: string;
    value: OutboxItem;
    indexes: { "by-user": string };
  };
  favorites: {
    key: string;
    value: FavoriteRecord;
    indexes: { "by-user": string };
  };
};

type OfflineDB = IDBPDatabase<OfflineSchema>;

export function openOfflineDb(): Promise<OfflineDB> {
  return openDB<OfflineSchema>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("snapshot")) {
        db.createObjectStore("snapshot", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        const outbox = db.createObjectStore("outbox", { keyPath: "clientId" });
        outbox.createIndex("by-user", "userId");
      }
      if (!db.objectStoreNames.contains("favorites")) {
        const favorites = db.createObjectStore("favorites", {
          keyPath: "id",
        });
        favorites.createIndex("by-user", "userId");
      }
    },
  });
}
