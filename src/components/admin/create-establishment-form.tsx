"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SCHEDULE_DAYS } from "@/lib/catalog/schedule";
import { formatCoordinate } from "@/lib/vendor/schedule";
import { createEstablishmentAction } from "@/server/actions/admin";

type BlockOption = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function CreateEstablishmentForm({ blocks }: { blocks: BlockOption[] }) {
  const firstBlock = blocks[0];
  const [blockId, setBlockId] = useState(firstBlock?.id ?? "");
  const [lat, setLat] = useState(
    firstBlock ? formatCoordinate(firstBlock.latitude) : "",
  );
  const [lng, setLng] = useState(
    firstBlock ? formatCoordinate(firstBlock.longitude) : "",
  );
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  function handleBlockChange(value: string) {
    setBlockId(value);
    const block = blocks.find((item) => item.id === value);
    if (block) {
      setLat(formatCoordinate(block.latitude));
      setLng(formatCoordinate(block.longitude));
    }
  }

  if (blocks.length === 0) {
    return (
      <p className="mt-3 text-sm text-carbon/70">
        No hay bloques del campus cargados. Revisa la migración o el seed antes
        de crear un local.
      </p>
    );
  }

  return (
    <form
      action={createEstablishmentAction}
      className="mt-4 flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-name" className="text-sm font-medium text-carbon">
            Nombre del local
          </label>
          <input
            id="new-name"
            name="name"
            required
            minLength={3}
            maxLength={60}
            onChange={(event) => {
              if (!slugTouched) {
                setSlug(slugify(event.target.value));
              }
            }}
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="new-slug" className="text-sm font-medium text-carbon">
            Slug de la URL
          </label>
          <input
            id="new-slug"
            name="slug"
            required
            minLength={3}
            maxLength={80}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="cafeteria-central"
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
          />
          <p className="text-xs text-carbon/60">
            Aparece en /establecimiento/&lt;slug&gt;.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="new-category"
            className="text-sm font-medium text-carbon"
          >
            Categoría
          </label>
          <input
            id="new-category"
            name="category"
            required
            maxLength={40}
            placeholder="Almuerzos, café, comidas rápidas…"
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="new-address"
            className="text-sm font-medium text-carbon"
          >
            Dirección o referencia
          </label>
          <input
            id="new-address"
            name="address"
            maxLength={120}
            placeholder="Bloque Central, entrada norte"
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="new-description"
          className="text-sm font-medium text-carbon"
        >
          Descripción
        </label>
        <textarea
          id="new-description"
          name="description"
          rows={3}
          maxLength={600}
          placeholder="Qué cocina, qué la hace distinta y a qué hora abre."
          className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
        />
      </div>

      <fieldset className="border border-carbon/25 p-3">
        <legend className="px-1 text-sm font-medium text-carbon">
          Ubicación
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="new-block"
              className="text-sm font-medium text-carbon"
            >
              Bloque de referencia
            </label>
            <select
              id="new-block"
              name="blockId"
              required
              value={blockId}
              onChange={(event) => handleBlockChange(event.target.value)}
              className="h-11 border border-carbon bg-cream px-2 text-base text-carbon"
            >
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="new-lat"
              className="text-sm font-medium text-carbon"
            >
              Latitud
            </label>
            <input
              id="new-lat"
              name="lat"
              inputMode="decimal"
              required
              value={lat}
              onChange={(event) => setLat(event.target.value)}
              className="h-11 border border-carbon bg-cream px-3 text-base text-carbon"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="new-lng"
              className="text-sm font-medium text-carbon"
            >
              Longitud
            </label>
            <input
              id="new-lng"
              name="lng"
              inputMode="decimal"
              required
              value={lng}
              onChange={(event) => setLng(event.target.value)}
              className="h-11 border border-carbon bg-cream px-3 text-base text-carbon"
            />
          </div>
        </div>
        <p className="mt-2 max-w-[60ch] text-xs leading-relaxed text-carbon/60">
          Al elegir un bloque se copian sus coordenadas; puedes ajustarlas si el
          local está en otro punto.
        </p>
      </fieldset>

      <details className="border border-carbon/25 p-3">
        <summary className="cursor-pointer text-sm font-medium text-carbon">
          Horario semanal (opcional)
        </summary>
        <div className="mt-3 divide-y divide-carbon/10">
          {SCHEDULE_DAYS.map(({ key, label }) => (
            <div
              key={key}
              className="grid items-center gap-2 py-2 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <span className="text-sm font-medium text-carbon">{label}</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {[0, 1].map((slot) => (
                  <div key={slot} className="flex items-center gap-2">
                    <input
                      type="time"
                      name={`${key}-${slot + 1}-start`}
                      aria-label={`${label} abre${slot === 0 ? "" : " (segunda franja)"}`}
                      className="w-full border border-carbon bg-cream px-2 py-1.5 text-sm text-carbon"
                    />
                    <span className="text-xs text-carbon/50">a</span>
                    <input
                      type="time"
                      name={`${key}-${slot + 1}-end`}
                      aria-label={`${label} cierra${slot === 0 ? "" : " (segunda franja)"}`}
                      className="w-full border border-carbon bg-cream px-2 py-1.5 text-sm text-carbon"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      <p className="text-sm text-carbon/65">
        El local se crea como borrador. Apruébalo desde la lista para que
        aparezca en el catálogo.
      </p>

      <Button type="submit" className="w-fit">
        Crear local
      </Button>
    </form>
  );
}
