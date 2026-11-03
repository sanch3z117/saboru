"use client";

import { useEffect } from "react";

import { refreshSnapshot } from "@/lib/offline/snapshot-store";

/**
 * Refresca el snapshot público al abrir, al volver la red y al volver a la
 * pestaña. No bloquea la página y no hace nada si no hay conexión.
 */
export function SnapshotRefresher() {
  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      if (cancelled || navigator.onLine === false) {
        return;
      }
      void refreshSnapshot();
    };

    refresh();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
