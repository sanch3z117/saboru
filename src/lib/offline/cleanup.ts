import { openOfflineDb } from "@/lib/offline/db";
import { clearViewer } from "@/lib/offline/viewer";

const PRIVATE_CACHE_PREFIXES = [
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "others",
  "apis",
  "next-data",
  "next-image",
];

export function isPrivateCacheName(name: string) {
  return PRIVATE_CACHE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}-`),
  );
}

export async function countPendingOutbox(): Promise<number> {
  if (typeof indexedDB === "undefined") {
    return 0;
  }

  const db = await openOfflineDb();
  try {
    const items = await db.getAll("outbox");
    return items.filter(
      (item) => item.status === "pending" || item.status === "sending",
    ).length;
  } finally {
    db.close();
  }
}

/**
 * Borra los datos privados del dispositivo: outbox y favoritos locales, más
 * las cachés que alguna versión anterior pudiera haber llenado con HTML/RSC.
 * El snapshot público y las cachés de estáticos/imágenes se conservan.
 */
export async function cleanupLocalUserData(): Promise<{
  pendingRemoved: number;
}> {
  let pendingRemoved = 0;

  if (typeof indexedDB !== "undefined") {
    const db = await openOfflineDb();
    try {
      const transaction = db.transaction(["outbox", "favorites"], "readwrite");
      const outbox = transaction.objectStore("outbox");
      const items = await outbox.getAll();

      pendingRemoved = items.filter(
        (item) => item.status === "pending" || item.status === "sending",
      ).length;

      await Promise.all([
        outbox.clear(),
        transaction.objectStore("favorites").clear(),
        transaction.done,
      ]);
    } finally {
      db.close();
    }
  }

  if (typeof caches !== "undefined") {
    const names = await caches.keys();
    await Promise.all(
      names.filter(isPrivateCacheName).map((name) => caches.delete(name)),
    );
  }

  clearViewer();

  return { pendingRemoved };
}

/**
 * Pregunta antes de descartar envíos pendientes. Devuelve `false` solo si la
 * persona decide no cerrar sesión.
 */
export async function confirmPendingOutbox(): Promise<boolean> {
  const pending = await countPendingOutbox().catch(() => 0);

  if (pending > 0 && typeof window !== "undefined") {
    return window.confirm(
      `Tienes ${pending} envío${pending === 1 ? "" : "s"} pendiente${
        pending === 1 ? "" : "s"
      }. Si cierras sesión se borrarán. ¿Continuar?`,
    );
  }

  return true;
}
