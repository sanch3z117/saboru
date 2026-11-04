"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { enqueueOperation } from "@/lib/offline/outbox";
import { reportReviewSchema } from "@/lib/validations/review";

export function OfflineReportForm({
  userId,
  reviewId,
}: {
  userId: string;
  reviewId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);

    const formData = new FormData(form);
    const parsed = reportReviewSchema.safeParse({
      reviewId,
      clientId: crypto.randomUUID(),
      reason: formData.get("reason"),
    });

    if (!parsed.success) {
      setPending(false);
      setMessage({
        tone: "error",
        text: parsed.error.issues[0]?.message ?? "Escribe el motivo.",
      });
      return;
    }

    const result = await enqueueOperation({
      userId,
      type: "report",
      payload: { reviewId, reason: parsed.data.reason },
    });

    setPending(false);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text:
          result.reason === "quota"
            ? "El almacenamiento del dispositivo está lleno."
            : "No pudimos guardar el reporte.",
      });
      return;
    }

    form.reset();
    setOpen(false);
    setMessage({ tone: "ok", text: "Pendiente de envío." });
    window.dispatchEvent(new Event("saboru:outbox-changed"));
  }

  if (!open) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-carbon/70 underline underline-offset-4"
        >
          Reportar
        </button>
        {message ? (
          <p role="status" className="text-xs font-semibold text-carbon">
            {message.text}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2">
      <Label htmlFor={`off-report-${reviewId}`}>Motivo del reporte</Label>
      <Textarea
        id={`off-report-${reviewId}`}
        name="reason"
        rows={2}
        maxLength={300}
        required
        className="min-h-16 text-sm"
        placeholder="Cuéntanos qué pasa con esta reseña"
      />

      {message ? (
        <Alert
          tone={message.tone === "error" ? "error" : "success"}
          className="px-3 py-2 text-xs"
        >
          {message.text}
        </Alert>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Enviando…" : "Enviar reporte"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
