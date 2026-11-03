"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  isUpdateBlocked,
  subscribeUpdateBlocked,
} from "@/lib/offline/update-guard";

export function ServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [reloading, setReloading] = useState(false);
  const blocked = useSyncExternalStore(
    subscribeUpdateBlocked,
    isUpdateBlocked,
    () => false,
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    const track = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaiting(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) {
          return;
        }
        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaiting(installing);
          }
        });
      });
    };

    void navigator.serviceWorker.ready.then((registration) => {
      if (!cancelled) {
        track(registration);
      }
    });

    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  if (!waiting) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-carbon bg-cream px-4 py-3 shadow-[0_-2px_0_0_rgba(43,43,43,0.08)]"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="max-w-[46ch] text-sm font-medium text-carbon">
          Hay una versión nueva de SaborU. Se aplica al recargar.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={blocked || reloading}
          onClick={() => {
            setReloading(true);
            waiting.postMessage({ type: "SKIP_WAITING" });
          }}
        >
          {reloading
            ? "Actualizando…"
            : blocked
              ? "Espera a que termine el envío"
              : "Actualizar"}
        </Button>
      </div>
    </div>
  );
}
