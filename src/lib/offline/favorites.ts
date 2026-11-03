import { openOfflineDb, type FavoriteRecord } from "@/lib/offline/db";

export type FavoriteTarget = {
  userId: string;
  establishmentId: string;
  productId: string | null;
};

export function favoriteId({
  userId,
  establishmentId,
  productId,
}: FavoriteTarget) {
  return `${userId}:${establishmentId}:${productId ?? "-"}`;
}

export async function isFavorite(target: FavoriteTarget): Promise<boolean> {
  const db = await openOfflineDb();
  try {
    const record = await db.get("favorites", favoriteId(target));
    return Boolean(record);
  } finally {
    db.close();
  }
}

export async function listLocalFavorites(
  userId: string,
): Promise<FavoriteRecord[]> {
  const db = await openOfflineDb();
  try {
    return await db.getAllFromIndex("favorites", "by-user", userId);
  } finally {
    db.close();
  }
}

export async function setLocalFavorite(
  target: FavoriteTarget,
  action: "add" | "remove",
): Promise<{ ok: true } | { ok: false; reason: "quota" | "error" }> {
  try {
    const db = await openOfflineDb();
    try {
      if (action === "add") {
        await db.put("favorites", {
          id: favoriteId(target),
          userId: target.userId,
          establishmentId: target.establishmentId,
          productId: target.productId,
          createdAt: Date.now(),
        });
      } else {
        await db.delete("favorites", favoriteId(target));
      }
    } finally {
      db.close();
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason:
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "QuotaExceededError"
          ? "quota"
          : "error",
    };
  }
}
