"use client";

import { Search, X } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_CATALOG_ORDER,
  ORDER_OPTIONS,
  hasActiveDiscoveryFilters,
  type DiscoveryFilters,
} from "@/lib/catalog/discovery";
import { formatPrice } from "@/lib/format";

const BUDGET_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Sin límite" },
  { value: 5000, label: formatPrice(5000) },
  { value: 10000, label: formatPrice(10000) },
  { value: 15000, label: formatPrice(15000) },
];

export function DiscoverySearch({
  query,
  onQueryChange,
  filters,
  categories,
  onFiltersChange,
  onClear,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filters: DiscoveryFilters;
  categories: string[];
  onFiltersChange: (patch: Partial<DiscoveryFilters>) => void;
  onClear: () => void;
}) {
  return (
    <div
      data-testid="discovery-search"
      className="sticky top-0 z-30 border-y-2 border-carbon bg-cream py-3"
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-carbon/60"
        />
        <label htmlFor="descubrir-q" className="sr-only">
          Buscar en el catálogo
        </label>
        <Input
          id="descubrir-q"
          type="search"
          value={query}
          maxLength={80}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Busca plato, local o categoría"
          className="pr-10 pl-9"
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpiar texto de búsqueda"
            onClick={() => onQueryChange("")}
            className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-pill text-carbon/70 hover:bg-carbon/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        <Chip
          asChild
          tone={filters.category === null ? "active" : "neutral"}
          className="shrink-0"
        >
          <button
            type="button"
            aria-pressed={filters.category === null}
            onClick={() => onFiltersChange({ category: null, page: 1 })}
          >
            Todas
          </button>
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category}
            asChild
            tone={filters.category === category ? "active" : "neutral"}
            className="shrink-0"
          >
            <button
              type="button"
              aria-pressed={filters.category === category}
              onClick={() => onFiltersChange({ category, page: 1 })}
            >
              {category}
            </button>
          </Chip>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-carbon/60">
          Presupuesto
        </span>
        {BUDGET_OPTIONS.map((option) => (
          <Chip
            key={option.value ?? "all"}
            asChild
            tone={filters.budget === option.value ? "active" : "neutral"}
          >
            <button
              type="button"
              aria-pressed={filters.budget === option.value}
              onClick={() => onFiltersChange({ budget: option.value, page: 1 })}
            >
              {option.label}
            </button>
          </Chip>
        ))}
        <Chip asChild tone={filters.openNow ? "active" : "neutral"}>
          <button
            type="button"
            aria-pressed={filters.openNow}
            onClick={() =>
              onFiltersChange({ openNow: !filters.openNow, page: 1 })
            }
          >
            Abierto ahora
          </button>
        </Chip>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-carbon/60">Ordenar</span>
        {ORDER_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            asChild
            tone={filters.order === option.value ? "active" : "neutral"}
          >
            <button
              type="button"
              aria-pressed={filters.order === option.value}
              onClick={() => onFiltersChange({ order: option.value, page: 1 })}
            >
              {option.label}
            </button>
          </Chip>
        ))}
        {hasActiveDiscoveryFilters(filters) ? (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto text-xs font-semibold text-carbon/70 underline underline-offset-4 hover:text-carbon"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {filters.order === DEFAULT_CATALOG_ORDER ? null : (
        <p className="mt-1 text-[11px] text-carbon/50">
          Los locales sin reseñas suficientes quedan al final al ordenar por
          rating.
        </p>
      )}
    </div>
  );
}
