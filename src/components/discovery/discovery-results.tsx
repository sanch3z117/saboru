"use client";

import Link from "next/link";

import { EstablishmentCard } from "@/components/catalog/establishment-card";
import { Button } from "@/components/ui/button";
import type { EstablishmentCardData } from "@/lib/catalog/cards";
import { formatPrice } from "@/lib/format";
import type { SearchPlaceGroup } from "@/lib/map/places";

function cardFromGroup(group: SearchPlaceGroup): EstablishmentCardData {
  const first = group.items[0];
  return {
    id: group.place.id,
    slug: group.place.slug,
    name: group.place.name,
    description: first?.establishment_description ?? "",
    category: group.place.category,
    plan: group.place.plan,
    status: "active",
    photoPath: group.place.photoPath,
    schedule: first?.establishment_schedule ?? null,
    distanceMeters: group.place.distanceMeters,
    priceFromCop: group.place.priceFromCop,
    rating: group.place.rating,
    reviewCount: group.place.reviewCount,
  };
}

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
      <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-carbon pb-3">
        <h2
          id="resultados-titulo"
          className="font-display text-2xl font-semibold text-carbon"
        >
          Resultados
        </h2>
        <p
          data-testid="discovery-count"
          aria-live="polite"
          className="rounded-pill border-2 border-carbon bg-cream px-3 py-1 text-xs font-semibold text-carbon"
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
        <ol className="mt-5 space-y-5">
          {groups.map((group) => {
            const { place, items } = group;
            const selected = place.id === selectedId;

            return (
              <li
                key={place.id}
                id={`discovery-place-${place.id}`}
                data-testid="discovery-place"
                className="scroll-mt-24 border-b-2 border-carbon/15 pb-5"
              >
                <EstablishmentCard
                  establishment={cardFromGroup(group)}
                  variant="list"
                  selected={selected}
                  onSelect={() => onSelect(place.id)}
                />

                <ul
                  aria-label={`Menú de ${place.name}`}
                  className="mt-2 divide-y divide-carbon/15 border-t-2 border-carbon/20 px-1"
                >
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-3 py-2"
                    >
                      <Link
                        href={`/producto/${item.id}`}
                        className="min-w-0 truncate text-sm font-medium text-carbon underline-offset-4 hover:underline"
                      >
                        {item.name}
                      </Link>
                      <span className="shrink-0 font-display text-sm font-semibold text-carbon">
                        {formatPrice(item.price_cop)}
                      </span>
                    </li>
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
