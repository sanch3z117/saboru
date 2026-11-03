"use client";

import { useEffect } from "react";

import type { VendorFormState } from "@/lib/vendor/form-state";

export const PANEL_NOTICE_KEY = "saboru:panel-notice";

/**
 * El árbol RSC actualizado se pierde a veces en producción (React 19.2.9 +
 * Next 15.5.28). Tras guardar recargamos el panel y conservamos el aviso.
 * Si la respuesta de la acción también se pierde, `pending` se queda en true:
 * la recarga de respaldo evita dejar la UI con datos viejos.
 */
export function useVendorFormFeedback(
  state: VendorFormState,
  pending: boolean,
) {
  useEffect(() => {
    if (state.status === "success") {
      sessionStorage.setItem(PANEL_NOTICE_KEY, state.message);
      window.location.reload();
    }
  }, [state]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => {
      window.location.reload();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [pending]);
}
