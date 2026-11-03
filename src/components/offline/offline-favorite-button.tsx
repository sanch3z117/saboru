"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { isFavorite, setLocalFavorite } from "@/lib/offline/favorites";
import { enqueueOperation } from "@/lib/offline/outbox";
import { QUOTA_MESSAGE } from "@/lib/offline/quota";

export function OfflineFavoriteButton({
  userId,
  establishmentId,
  productId,
}: {
  userId: string;
  establishmentId: string;
  productId: string | null;
}) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isFavorite({ userId, establishmentId, productId }).then((value) => {
      if (!cancelled) setSaved(value);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, establishmentId, productId]);

  async function toggle() {
    if (saved === null) return;

    const action = saved ? "remove" : "add";
    setPending(true);

    const local = await setLocalFavorite(
      { userId, establishmentId, productId },
      action,
    );

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
        { userId, establishmentId, productId },
        action === "add" ? "remove" : "add",
      );
      setMessage("No pudimos guardar la operación.");
      return;
    }

    setSaved(!saved);
    setMessage(
      action === "add"
        ? "Guardado. Pendiente de envío."
        : "Quitado. Pendiente de envío.",
    );
    window.dispatchEvent(new Event("saboru:outbox-changed"));
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending || saved === null}
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
