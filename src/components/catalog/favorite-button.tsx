"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { resolveFavoriteState } from "@/lib/offline/favorite-state";
import {
  findPendingFavorite,
  isFavorite,
  removePendingFavoritesBefore,
  setLocalFavorite,
} from "@/lib/offline/favorites";
import { enqueueOperation } from "@/lib/offline/outbox";
import { QUOTA_MESSAGE } from "@/lib/offline/quota";

export function FavoriteButton({
  userId,
  establishmentId,
  productId,
  initialSaved = null,
  serverAvailable = false,
}: {
  userId: string;
  establishmentId: string;
  productId: string | null;
  initialSaved?: boolean | null;
  serverAvailable?: boolean;
}) {
  const target = { userId, establishmentId, productId };
  const [saved, setSaved] = useState<boolean | null>(
    serverAvailable ? initialSaved : null,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const serverLoadedAt = Date.now();

    async function resolve() {
      const localSaved = await isFavorite(target);
      const pendingFavorite = serverAvailable
        ? await findPendingFavorite(target)
        : null;

      const resolution = resolveFavoriteState({
        serverAvailable,
        serverSaved: initialSaved,
        localSaved,
        pendingAt: pendingFavorite?.createdAt ?? null,
        serverLoadedAt,
      });

      if (resolution.source === "server") {
        await setLocalFavorite(
          target,
          resolution.saved ? "add" : "remove",
        );
        await removePendingFavoritesBefore(target, serverLoadedAt);
      }

      if (!cancelled) setSaved(resolution.saved);
    }

    void resolve().catch(() => {
      if (!cancelled) setSaved(serverAvailable ? initialSaved : false);
    });

    return () => {
      cancelled = true;
    };
    // `target` se construye por render; las claves primitivas son la identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    establishmentId,
    initialSaved,
    productId,
    serverAvailable,
    userId,
  ]);

  async function toggle() {
    if (saved === null) return;

    const action = saved ? "remove" : "add";
    setPending(true);

    const local = await setLocalFavorite(target, action);
    if (!local.ok) {
      setPending(false);
      setMessage(
        local.reason === "quota"
          ? QUOTA_MESSAGE
          : "No pudimos guardar el favorito.",
      );
      return;
    }

    const queued = await enqueueOperation({
      userId,
      type: "favorite",
      payload: { action, establishmentId, productId },
    });

    setPending(false);

    if (!queued.ok) {
      await setLocalFavorite(
        target,
        action === "add" ? "remove" : "add",
      );
      setMessage("No pudimos guardar la operación.");
      return;
    }

    setSaved(!saved);
    const online = typeof navigator === "undefined" || navigator.onLine !== false;
    setMessage(
      action === "add"
        ? online
          ? "Guardado."
          : "Guardado. Pendiente de envío."
        : online
          ? "Quitado."
          : "Quitado. Pendiente de envío.",
    );
    window.dispatchEvent(new Event("saboru:outbox-changed"));
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending || saved === null}
        aria-pressed={saved === true}
        onClick={toggle}
      >
        {pending ? "Guardando…" : saved ? "Quitar de guardados" : "Guardar"}
      </Button>
      {message ? (
        <p role="status" className="text-sm text-carbon/75">
          {message}
        </p>
      ) : null}
    </div>
  );
}
