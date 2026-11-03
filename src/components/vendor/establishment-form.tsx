"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { useVendorFormFeedback } from "@/components/vendor/use-vendor-form-feedback";
import {
  SCHEDULE_DAYS,
  type WeeklySchedule,
} from "@/lib/catalog/schedule";
import { initialVendorState } from "@/lib/vendor/form-state";
import { saveEstablishmentAction } from "@/server/actions/vendor";

type EstablishmentFormProps = {
  establishment: {
    name: string;
    description: string;
    address: string;
    category: string;
    schedule: WeeklySchedule;
    lat: string;
    lng: string;
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

      <fieldset className="border border-carbon/25 p-3">
        <legend className="px-1 text-sm font-medium text-carbon">
          Horario semanal (hora de Bogotá)
        </legend>
        <div className="divide-y divide-carbon/10">
          {SCHEDULE_DAYS.map(({ key, label }) => {
            const ranges = establishment.schedule[key] ?? [];

            return (
              <div
                key={key}
                className="grid items-center gap-2 py-2 sm:grid-cols-[7rem_minmax(0,1fr)]"
              >
                <span className="text-sm font-medium text-carbon">{label}</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[0, 1].map((slot) => {
                    const suffix = slot === 0 ? "" : " (segunda franja)";
                    return (
                      <div key={slot} className="flex items-center gap-2">
                        <input
                          type="time"
                          name={`${key}-${slot + 1}-start`}
                          defaultValue={ranges[slot]?.[0] ?? ""}
                          aria-label={`${label} abre${suffix}`}
                          className="w-full border border-carbon bg-cream px-2 py-1.5 text-sm text-carbon"
                        />
                        <span className="text-xs text-carbon/50">a</span>
                        <input
                          type="time"
                          name={`${key}-${slot + 1}-end`}
                          defaultValue={ranges[slot]?.[1] ?? ""}
                          aria-label={`${label} cierra${suffix}`}
                          className="w-full border border-carbon bg-cream px-2 py-1.5 text-sm text-carbon"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 max-w-[60ch] text-xs leading-relaxed text-carbon/60">
          Deja un día vacío si no abres. Si el cierre es menor que la apertura,
          el horario cruza medianoche (por ejemplo 18:00 a 02:00).
        </p>
      </fieldset>

      <fieldset className="border border-carbon/25 p-3">
        <legend className="px-1 text-sm font-medium text-carbon">
          Ubicación
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="lat" className="text-sm font-medium text-carbon">
              Latitud
            </label>
            <input
              id="lat"
              name="lat"
              inputMode="decimal"
              required
              defaultValue={establishment.lat}
              placeholder="5.552"
              className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="lng" className="text-sm font-medium text-carbon">
              Longitud
            </label>
            <input
              id="lng"
              name="lng"
              inputMode="decimal"
              required
              defaultValue={establishment.lng}
              placeholder="-73.3567"
              className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
            />
          </div>
        </div>
        <p className="mt-2 max-w-[60ch] text-xs leading-relaxed text-carbon/60">
          Copia las coordenadas desde Google Maps (clic derecho sobre el punto
          del local). La distancia del catálogo se calcula con este punto.
        </p>
      </fieldset>

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
