"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { useVendorFormFeedback } from "@/components/vendor/use-vendor-form-feedback";
import { initialVendorState } from "@/lib/vendor/form-state";
import { saveEstablishmentAction } from "@/server/actions/vendor";

type EstablishmentFormProps = {
  establishment: {
    name: string;
    description: string;
    address: string;
    category: string;
  };
};

export function EstablishmentForm({ establishment }: EstablishmentFormProps) {
  const [state, formAction, pending] = useActionState(
    saveEstablishmentAction,
    initialVendorState,
  );
  useVendorFormFeedback(state, pending);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-carbon">
            Nombre del local
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={3}
            maxLength={60}
            defaultValue={establishment.name}
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-carbon">
            Categoría
          </label>
          <input
            id="category"
            name="category"
            maxLength={40}
            defaultValue={establishment.category}
            placeholder="Almuerzos, café, comidas rápidas…"
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm font-medium text-carbon">
          Dirección o punto de referencia
        </label>
        <input
          id="address"
          name="address"
          maxLength={120}
          defaultValue={establishment.address}
          placeholder="Bloque Central, entrada norte"
          className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-carbon">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={600}
          defaultValue={establishment.description}
          placeholder="Qué cocinas, qué te hace distinto y a qué hora abres."
          className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
        />
      </div>

      <p className="text-sm text-carbon/65">
        El nombre del local en la URL, el plan y el estado los gestiona el
        equipo de SaborU.
      </p>

      {state.status === "error" ? (
        <p role="alert" className="border border-carbon px-4 py-3 text-sm font-semibold">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Guardando…" : "Guardar ficha"}
      </Button>
    </form>
  );
}
