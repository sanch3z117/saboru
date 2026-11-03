"use client";

import { useEffect } from "react";

const PENDING_KEY = "saboru:admin-action-pending";

/**
 * Next 15.5 + React 19.2 pueden perder el árbol RSC después de una acción que
 * revalida varias rutas y dejar la página con datos viejos. El servidor deja
 * una cookie de aviso; esperamos a que llegue y recargamos una vez para que la
 * administración vea el resultado real.
 */
export function AdminActionRefresh() {
  useEffect(() => {
    const handleSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.closest("main")) {
        return;
      }

      sessionStorage.setItem(PENDING_KEY, "1");
      const startedAt = Date.now();

      const check = () => {
        if (sessionStorage.getItem(PENDING_KEY) !== "1") {
          return;
        }

        const hasNotice =
          document.cookie.includes("saboru_admin_notice=") ||
          document.cookie.includes("saboru_admin_error=");

        if (hasNotice || Date.now() - startedAt > 10_000) {
          sessionStorage.removeItem(PENDING_KEY);
          window.location.reload();
          return;
        }

        window.setTimeout(check, 300);
      };

      window.setTimeout(check, 300);
    };

    document.addEventListener("submit", handleSubmit);
    return () => document.removeEventListener("submit", handleSubmit);
  }, []);

  return null;
}
