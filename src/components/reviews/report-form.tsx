"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  reportReviewAction,
  type ReviewFormState,
} from "@/server/actions/reviews";

const initialState: ReviewFormState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Enviando…" : "Enviar reporte"}
    </Button>
  );
}

export function ReportForm({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [reason, setReason] = useState("");
  const [state, formAction] = useActionState(reportReviewAction, initialState);

  useEffect(() => {
    setClientId(crypto.randomUUID());
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-carbon/70 underline underline-offset-4"
      >
        Reportar
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="clientId" value={clientId} />
      <label htmlFor={`reason-${reviewId}`} className="text-sm font-medium">
        Motivo del reporte
      </label>
      <textarea
        id={`reason-${reviewId}`}
        name="reason"
        rows={2}
        maxLength={300}
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full border border-carbon bg-cream px-3 py-2 text-sm text-carbon"
        placeholder="Cuéntanos qué pasa con esta reseña"
      />
      <p className="text-xs text-carbon/60">{reason.length} / 300</p>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-semibold text-carbon">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <p role="status" className="text-sm font-medium text-carbon">
          {state.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton />
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
