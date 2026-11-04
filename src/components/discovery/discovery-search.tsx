"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import {
  BUDGET_MAX_COP,
  BUDGET_MIN_COP,
  BUDGET_STEP_COP,
  DEFAULT_CATALOG_ORDER,
  ORDER_OPTIONS,
  budgetForSlider,
  hasActiveDiscoveryFilters,
  type DiscoveryFilters,
} from "@/lib/catalog/discovery";
import { formatPrice } from "@/lib/format";

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
  const [hydrated, setHydrated] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(() =>
    budgetForSlider(filters.budget),
  );
  const budgetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(
    () => () => {
      if (budgetTimerRef.current !== null) {
        window.clearTimeout(budgetTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setBudgetDraft(budgetForSlider(filters.budget));
  }, [filters.budget]);

  const committedBudget = budgetForSlider(filters.budget);
  const pendingBudget = budgetDraft !== committedBudget;
  const shownBudget = pendingBudget
    ? budgetDraft
    : filters.budget === null
      ? null
      : committedBudget;
  const budgetLabel =
    shownBudget === null ? "Sin límite" : `Hasta ${formatPrice(shownBudget)}`;

  const commitBudget = (value: number) => {
    if (budgetTimerRef.current !== null) {
      window.clearTimeout(budgetTimerRef.current);
      budgetTimerRef.current = null;
    }
    const next = value >= BUDGET_MAX_COP ? null : value;
    if (next !== filters.budget) {
      onFiltersChange({ budget: next, page: 1 });
    }
  };

  // Si el navegador no entrega `pointerup` al soltar la barra, el debounce
  // aplica igual el último valor sin esperar a otro gesto.
  const scheduleBudget = (value: number) => {
    if (budgetTimerRef.current !== null) {
      window.clearTimeout(budgetTimerRef.current);
    }
    budgetTimerRef.current = window.setTimeout(() => {
      budgetTimerRef.current = null;
      commitBudget(value);
    }, 300);
  };

  return (
    <div
      data-testid="discovery-search"
      data-hydrated={hydrated ? "true" : "false"}
      className="rounded-card border-2 border-carbon bg-cream p-3 shadow-hard-sm sm:p-4"
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

      <div className="mt-4 flex items-center gap-2 overflow-x-auto border-b border-carbon/20 pb-3">
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

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel bg-campus/25 px-3 py-2">
        <span className="text-sm font-semibold text-carbon">Presupuesto</span>

        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <div className="flex items-center gap-3">
            <input
              id="descubrir-presupuesto"
              data-testid="budget-range"
              type="range"
              min={BUDGET_MIN_COP}
              max={BUDGET_MAX_COP}
              step={BUDGET_STEP_COP}
              value={budgetForSlider(budgetDraft)}
              aria-label="Presupuesto máximo"
              aria-valuetext={budgetLabel}
              onChange={(event) => {
                const value = Number(event.target.value);
                setBudgetDraft(value);
                scheduleBudget(value);
              }}
              onPointerUp={(event) =>
                commitBudget(Number(event.currentTarget.value))
              }
              onKeyUp={(event) =>
                commitBudget(Number(event.currentTarget.value))
              }
              className="h-10 w-full max-w-xs cursor-pointer accent-antojo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
            />
            <output
              htmlFor="descubrir-presupuesto"
              className="min-w-[6.5rem] text-right text-xs font-semibold text-carbon"
            >
              {budgetLabel}
            </output>
          </div>
          <div
            aria-hidden="true"
            className="flex w-full max-w-xs justify-between text-[10px] text-carbon/50"
          >
            <span>{formatPrice(BUDGET_MIN_COP)}</span>
            <span>{formatPrice(BUDGET_MAX_COP)}</span>
          </div>
        </div>

        {filters.budget !== null ? (
          <Chip asChild tone="neutral">
            <button
              type="button"
              onClick={() => onFiltersChange({ budget: null, page: 1 })}
            >
              Quitar tope
            </button>
          </Chip>
        ) : null}
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-carbon">Ordenar</span>
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
