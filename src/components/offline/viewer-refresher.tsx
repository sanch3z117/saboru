"use client";

import { useEffect } from "react";

import {
  clearViewer,
  saveViewer,
  type CachedViewer,
} from "@/lib/offline/viewer";

/**
 * Mantiene `saboru:viewer` al día: al montar (login), al volver online y al
 * volver a la pestaña. Si la sesión no existe, borra el cache.
 */
export function ViewerRefresher() {
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (cancelled || navigator.onLine === false) return;

      try {
        const response = await fetch("/api/viewer", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          viewer: CachedViewer | null;
        };
        if (cancelled) return;
        if (data.viewer) {
          saveViewer(data.viewer);
        } else {
          clearViewer();
        }
      } catch {
        // Sin red o respuesta inválida: se conserva el último cache.
      }
    };

    void refresh();

    const handleOnline = () => void refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
