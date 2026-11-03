"use client";

import { useEffect, useState } from "react";

import { QUOTA_MESSAGE } from "@/lib/offline/quota";
import { refreshSnapshot } from "@/lib/offline/snapshot-store";

/**
 * Refresca el snapshot público al abrir, al volver la red y al volver a la
 * pestaña. No bloquea la página y no hace nada si no hay conexión.
 */
export function SnapshotRefresher() {
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (cancelled || navigator.onLine === false) {
        return;
      }

      const result = await refreshSnapshot();
      if (cancelled) return;

      if (result.ok) {
        setQuotaBlocked(false);
      } else if (result.reason === "quota") {
        setQuotaBlocked(true);
      }
    };

    void refresh();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
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

  if (!quotaBlocked) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-carbon bg-campus px-5 py-2 text-sm text-carbon sm:px-8"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
        <p>{QUOTA_MESSAGE}</p>
        <button
          type="button"
          onClick={() => setQuotaBlocked(false)}
          className="text-xs font-semibold underline underline-offset-4"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
