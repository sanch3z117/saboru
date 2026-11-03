"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { useUpdateBlocker } from "@/components/offline/use-update-blocker";
import {
  saveReviewAction,
  type ReviewFormState,
} from "@/server/actions/reviews";

const RATINGS = [
  { name: "rating_sabor", label: "Sabor" },
  { name: "rating_cantidad", label: "Cantidad" },
  { name: "rating_precio", label: "Precio" },
  { name: "rating_presentacion", label: "Presentación" },
  { name: "rating_calidad_precio", label: "Calidad/precio" },
] as const;

const initialState: ReviewFormState = { status: "idle", message: "" };

const SAVED_MESSAGE_KEY = "saboru:review-saved";

type ReviewFormProps = {
  mode: "create" | "edit";
  productId: string;
  establishmentId: string;
  establishmentSlug?: string;
  reviewId?: string;
  initial?: {
    rating_sabor: number;
    rating_cantidad: number;
    rating_precio: number;
    rating_presentacion: number;
    rating_calidad_precio: number;
    comment: string | null;
  };
};

export function ReviewForm({
  mode,
  productId,
  establishmentId,
  establishmentSlug,
  reviewId,
  initial,
}: ReviewFormProps) {
  const [clientId, setClientId] = useState("");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [state, setState] = useState<ReviewFormState>(initialState);
  const [pending, setPending] = useState(false);
  useUpdateBlocker(pending);

  useEffect(() => {
    setClientId(crypto.randomUUID());
    const savedMessage = sessionStorage.getItem(SAVED_MESSAGE_KEY);
    if (savedMessage) {
      sessionStorage.removeItem(SAVED_MESSAGE_KEY);
      setState({ status: "success", message: savedMessage });
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await saveReviewAction(state, formData);
    setState(result);
    setPending(false);

    if (result.status === "success") {
      // Limitación conocida: con React 19.2.9 + Next 15.5.28 en producción el
      // árbol RSC actualizado se pierde a veces (ni router.refresh() ni la
      // respuesta de la acción lo aplican). Recargamos la ficha entera y
      // conservamos el aviso para mostrarlo tras la recarga.
      sessionStorage.setItem(SAVED_MESSAGE_KEY, result.message);
      window.location.reload();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="establishmentId" value={establishmentId} />
      <input
        type="hidden"
        name="establishmentSlug"
        value={establishmentSlug ?? ""}
      />
      <input type="hidden" name="clientId" value={clientId} />
      {mode === "edit" && reviewId ? (
        <input type="hidden" name="reviewId" value={reviewId} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {RATINGS.map((rating) => (
          <fieldset key={rating.name} className="border border-carbon/20 p-3">
            <legend className="px-1 text-sm font-medium text-carbon">
              {rating.label}
            </legend>
            <div className="mt-1 flex flex-wrap gap-2">
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
                    defaultChecked={
                      initial?.[rating.name as keyof typeof initial] === value
                    }
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
        <label htmlFor="comment" className="text-sm font-medium text-carbon">
          Comentario (opcional, máx. 500)
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          maxLength={500}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="w-full border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/50"
          placeholder="¿Qué tal estaba la comida?"
        />
        <p className="text-xs text-carbon/60">{comment.length} / 500</p>
      </div>

      {state.status === "error" ? (
        <p
          role="alert"
          className="border border-carbon px-4 py-3 text-sm font-semibold text-carbon"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <p
          role="status"
          className="border border-carbon bg-campus px-4 py-3 text-sm font-medium text-carbon"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending
          ? "Guardando…"
          : mode === "edit"
            ? "Guardar cambios"
            : "Publicar reseña"}
      </Button>
    </form>
  );
}
