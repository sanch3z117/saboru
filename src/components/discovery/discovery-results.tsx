"use client";

import { MapPin, Star } from "lucide-react";
import Link from "next/link";

import { ProductRow } from "@/components/catalog/product-row";
import { Button } from "@/components/ui/button";
import { formatDistance, formatPrice, formatRating } from "@/lib/format";
import type { SearchPlaceGroup } from "@/lib/map/places";
import { cn } from "@/lib/utils";

export function DiscoveryResults({
  groups,
  totalProducts,
  selectedId,
  onSelect,
  onClear,
}: {
  groups: SearchPlaceGroup[];
  totalProducts: number;
  selectedId: string | null;
  onSelect: (placeId: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="min-w-0" aria-labelledby="resultados-titulo">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          id="resultados-titulo"
          className="font-display text-xl font-semibold text-carbon"
        >
          Resultados
        </h2>
        <p
          data-testid="discovery-count"
          aria-live="polite"
          className="text-sm text-carbon/65"
        >
          {groups.length} {groups.length === 1 ? "local" : "locales"} ·{" "}
          {totalProducts} {totalProducts === 1 ? "producto" : "productos"}
        </p>
      </div>

      {groups.length === 0 ? (
        <div
          data-testid="discovery-empty"
          className="mt-6 rounded-card border-2 border-dashed border-carbon/25 px-4 py-8"
        >
          <p className="font-display text-lg font-semibold text-carbon">
            No encontramos resultados
          </p>
          <p className="mt-1 max-w-[48ch] text-sm leading-relaxed text-carbon/70">
            Prueba con otro texto, más presupuesto, otra categoría o quita
            “Abierto ahora”.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={onClear}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <ol className="mt-4 space-y-5">
          {groups.map(({ place, items }) => {
            const selected = place.id === selectedId;
            return (
              <li
                key={place.id}
                id={`discovery-place-${place.id}`}
                data-testid="discovery-place"
                className={cn(
                  "scroll-mt-44 border-b-2 border-carbon/15 pb-4",
                  selected &&
                    "rounded-card border-2 border-carbon bg-campus/20 p-3",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Ver ${place.name} en el mapa`}
                      onClick={() => onSelect(place.id)}
                      className="text-left font-display text-lg leading-snug font-semibold text-carbon underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
                    >
                      {place.name}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-carbon/70">
                      <span>{place.category}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden="true" className="size-3.5" />
                        {formatDistance(place.distanceMeters)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Star
                          aria-hidden="true"
                          className="size-3.5 fill-antojo text-antojo"
                        />
                        {place.rating
                          ? `${formatRating(place.rating)} (${place.reviewCount})`
                          : "Sin reseñas suficientes"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-carbon">
                      {place.priceFromCop
                        ? `Desde ${formatPrice(place.priceFromCop)}`
                        : "Precio no disponible"}
                      <span className="font-normal text-carbon/60">
                        {" "}
                        · {items.length}{" "}
                        {items.length === 1 ? "coincidencia" : "coincidencias"}
                      </span>
                    </p>
                  </div>

                  <Link
                    href={`/establecimiento/${place.slug}`}
                    className="text-sm font-semibold text-carbon underline underline-offset-4 hover:no-underline"
                  >
                    Ver ficha
                  </Link>
                </div>

                <ul className="mt-2">
                  {items.map((item) => (
                    <ProductRow key={item.id} item={item} />
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
