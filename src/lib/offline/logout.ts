import { countPendingOutbox } from "@/lib/offline/cleanup";
import { syncOutbox } from "@/lib/offline/sync";

/**
 * Antes de cerrar sesión: si hay red, intenta enviar lo pendiente; si algo
 * sigue pendiente (incluido un `sending` huérfano), pide confirmación porque
 * el cleanup lo borrará.
 */
export async function prepareLogout(userId: string): Promise<boolean> {
  if (typeof navigator === "undefined" || navigator.onLine !== false) {
    const before = await countPendingOutbox().catch(() => 0);
    if (before > 0) {
      await syncOutbox(userId).catch(() => undefined);
    }
  }

  const after = await countPendingOutbox().catch(() => 0);
  if (after === 0) {
    return true;
  }

  if (typeof window === "undefined") {
    return true;
  }

  return window.confirm(
    `Tienes ${after} envío${after === 1 ? "" : "s"} pendiente${
      after === 1 ? "" : "s"
    }. Si cierras sesión se borrarán. ¿Continuar?`,
  );
}
