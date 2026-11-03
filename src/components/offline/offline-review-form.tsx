"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { enqueueOperation } from "@/lib/offline/outbox";
import { createReviewSchema } from "@/lib/validations/review";

const RATINGS = [
  { name: "rating_sabor", label: "Sabor" },
  { name: "rating_cantidad", label: "Cantidad" },
  { name: "rating_precio", label: "Precio" },
  { name: "rating_presentacion", label: "Presentación" },
  { name: "rating_calidad_precio", label: "Calidad/precio" },
] as const;

export function OfflineReviewForm({
  userId,
  productId,
  establishmentId,
}: {
  userId: string;
  productId: string;
  establishmentId: string;
}) {
  const [comment, setComment] = useState("");
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
    const parsed = createReviewSchema.safeParse({
      productId,
      establishmentId,
      clientId: crypto.randomUUID(),
      comment: formData.get("comment") ?? "",
      rating_sabor: formData.get("rating_sabor"),
      rating_cantidad: formData.get("rating_cantidad"),
      rating_precio: formData.get("rating_precio"),
      rating_presentacion: formData.get("rating_presentacion"),
      rating_calidad_precio: formData.get("rating_calidad_precio"),
    });

    if (!parsed.success) {
      setPending(false);
      setMessage({
        tone: "error",
        text: parsed.error.issues[0]?.message ?? "Revisa el formulario.",
      });
      return;
    }

    const result = await enqueueOperation({
      userId,
      type: "review",
      payload: {
        productId,
        establishmentId,
        comment: parsed.data.comment,
        rating_sabor: parsed.data.rating_sabor,
        rating_cantidad: parsed.data.rating_cantidad,
        rating_precio: parsed.data.rating_precio,
        rating_presentacion: parsed.data.rating_presentacion,
        rating_calidad_precio: parsed.data.rating_calidad_precio,
      },
    });

    setPending(false);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text:
          result.reason === "quota"
            ? "El almacenamiento del dispositivo está lleno. Libera espacio e inténtalo de nuevo."
            : "No pudimos guardar la reseña para enviarla después.",
      });
      return;
    }

    form.reset();
    setComment("");
    setMessage({ tone: "ok", text: "Pendiente de envío." });
    window.dispatchEvent(new Event("saboru:outbox-changed"));
  }

  return (
    <section aria-labelledby="off-escribir" className="mt-8">
      <h2
        id="off-escribir"
        className="font-display text-xl font-semibold text-carbon"
      >
        Escribe tu reseña
      </h2>
      <p className="mt-1 text-sm text-carbon/65">
        Se guarda en este dispositivo y se envía cuando vuelvas a tener
        conexión.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {RATINGS.map((rating) => (
            <fieldset key={rating.name} className="border border-carbon/20 p-3">
              <legend className="px-1 text-sm font-medium text-carbon">
                {rating.label}
              </legend>
              <div className="mt-1 flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-1 text-sm text-carbon"
                  >
                    <input
                      type="radio"
                      name={rating.name}
                      value={value}
                      required
                      className="size-4 accent-carbon"
                    />
                    {value}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="off-comment"
            className="text-sm font-medium text-carbon"
          >
            Comentario (opcional, máx. 500)
          </label>
          <textarea
            id="off-comment"
            name="comment"
            rows={3}
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="w-full border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/50"
            placeholder="¿Qué tal estaba la comida?"
          />
          <p className="text-xs text-carbon/60">{comment.length} / 500</p>
        </div>

        {message ? (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={`border px-4 py-3 text-sm font-semibold text-carbon ${
              message.tone === "error"
                ? "border-carbon"
                : "border-carbon bg-campus"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Guardando…" : "Enviar reseña"}
        </Button>
      </form>
    </section>
  );
}
