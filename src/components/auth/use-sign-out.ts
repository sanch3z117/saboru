"use client";

import { useRouter } from "next/navigation";

import { cleanupLocalUserData } from "@/lib/offline/cleanup";
import { prepareLogout } from "@/lib/offline/logout";
import { createClient } from "@/lib/supabase/browser";

/**
 * Cierre de sesión en cliente. El orden es obligatorio: enviar/confirmar lo
 * pendiente, limpiar IndexedDB/cachés/storage, revocar la sesión y navegar.
 * Nada de esto puede vivir en una server action.
 */
export function useSignOut() {
  const router = useRouter();

  return async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id ?? null;

    if (userId && !(await prepareLogout(userId))) {
      return;
    }

    await cleanupLocalUserData().catch(() => undefined);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
}
