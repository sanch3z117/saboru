"use client";

import {
  Apple,
  Coffee,
  Hamburger,
  Pizza,
  Search,
  SlidersHorizontal,
  Soup,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DialogDescription,
  DialogTitle,
  Sheet,
  SheetContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_CATALOG_ORDER,
  MAX_TOTAL,
  MIN_TOTAL,
  ORDER_OPTIONS,
  STEP,
  hasActiveDiscoveryFilters,
  normalizeBudgetRange,
  type DiscoveryFilters,
} from "@/lib/catalog/discovery";
import { formatPrice } from "@/lib/format";

function CategoryIcon({ category }: { category: string }) {
  const name = category.toLocaleLowerCase("es");
  if (name.includes("pizza")) return <Pizza aria-hidden="true" className="size-5" />;
  if (name.includes("bebida") || name.includes("café")) return <Coffee aria-hidden="true" className="size-5" />;
  if (name.includes("rápida") || name.includes("hamburg")) return <Hamburger aria-hidden="true" className="size-5" />;
  if (name.includes("salud")) return <Apple aria-hidden="true" className="size-5" />;
  if (name.includes("almuerzo")) return <Soup aria-hidden="true" className="size-5" />;
  return <Utensils aria-hidden="true" className="size-5" />;
}

function BudgetRange({
  min,
  max,
  onChange,
  onCommit,
}: {
  min: number;
  max: number | null;
  onChange: (range: { minBudget: number; budget: number | null }) => void;
  onCommit?: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<"min" | "max" | null>(null);
  const [active, setActive] = useState<"min" | "max" | null>(null);
  const upper = max ?? MAX_TOTAL;
  const rangeLabel = `${formatPrice(min)} - ${max === null ? "Sin límite" : formatPrice(max)}`;

  const updateFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    const thumb = activeRef.current;
    if (!track || !thumb) return;
    const rect = track.getBoundingClientRect();
    const raw = MIN_TOTAL + ((clientX - rect.left) / rect.width) * (MAX_TOTAL - MIN_TOTAL);
    const rounded = Math.round(raw / STEP) * STEP;
    const next = thumb === "min"
      ? normalizeBudgetRange(rounded, upper)
      : normalizeBudgetRange(min, rounded >= MAX_TOTAL ? null : rounded);
    onChange(next);
  }, [min, onChange, upper]);

  useEffect(() => {
    if (!active) return;
    const move = (event: PointerEvent) => updateFromPointer(event.clientX);
    const end = () => {
      activeRef.current = null;
      setActive(null);
      onCommit?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [active, onCommit, updateFromPointer]);

  const start = (event: React.PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const position = (event.clientX - rect.left) / rect.width * MAX_TOTAL;
    const minDistance = Math.abs(position - min);
    const maxDistance = Math.abs(position - upper);
    const selected = minDistance === maxDistance
      ? position <= min ? "min" : "max"
      : minDistance < maxDistance ? "min" : "max";
    activeRef.current = selected;
    setActive(selected);
    updateFromPointer(event.clientX);
  };

  const keyboard = (thumb: "min" | "max", event: React.KeyboardEvent) => {
    let value = thumb === "min" ? min : upper;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") value -= STEP;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") value += STEP;
    else if (event.key === "Home") value = MIN_TOTAL;
    else if (event.key === "End") value = MAX_TOTAL;
    else return;
    event.preventDefault();
    onChange(thumb === "min"
      ? normalizeBudgetRange(value, upper)
      : normalizeBudgetRange(min, value >= MAX_TOTAL ? null : value));
    onCommit?.();
  };

  const minPosition = (min / MAX_TOTAL) * 100;
  const maxPosition = (upper / MAX_TOTAL) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <div
          ref={trackRef}
          className="relative h-12 flex-1 touch-none"
          onPointerDown={start}
          data-testid="budget-range"
        >
          <div className="absolute top-1/2 right-0 left-0 h-2 -translate-y-1/2 rounded-pill bg-carbon/15" />
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-pill bg-antojo"
            style={{ left: `${minPosition}%`, right: `${100 - maxPosition}%` }}
          />
          {(["min", "max"] as const).map((thumb) => {
            const value = thumb === "min" ? min : upper;
            return (
              <div
                key={thumb}
                role="slider"
                tabIndex={0}
                aria-label={thumb === "min" ? "Presupuesto mínimo" : "Presupuesto máximo"}
                aria-valuemin={thumb === "min" ? MIN_TOTAL : min + STEP}
                aria-valuemax={thumb === "min" ? upper - STEP : MAX_TOTAL}
                aria-valuenow={value}
                aria-valuetext={thumb === "max" && max === null ? "Sin límite" : formatPrice(value)}
                onKeyDown={(event) => keyboard(thumb, event)}
                className="absolute top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-pill outline-none focus-visible:ring-2 focus-visible:ring-carbon"
                style={{ left: `${(value / MAX_TOTAL) * 100}%`, zIndex: active === thumb ? 3 : 2 }}
              >
                <span className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-carbon bg-cream shadow-sm" />
              </div>
            );
          })}
        </div>
        <output className="min-w-[7.5rem] text-right text-xs font-semibold text-carbon">
          {rangeLabel}
        </output>
      </div>
      <div className="flex justify-between text-[10px] text-carbon/50">
        <span>{formatPrice(MIN_TOTAL)}</span>
        <span>{formatPrice(MAX_TOTAL)}</span>
      </div>
    </div>
  );
}

function activeCount(filters: DiscoveryFilters) {
  return [
    Boolean(filters.q),
    filters.category.length > 0,
    filters.minBudget > MIN_TOTAL || filters.budget !== null,
    filters.openNow,
    filters.order !== DEFAULT_CATALOG_ORDER,
  ].filter(Boolean).length;
}

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
  const [sheetOpen, setSheetOpen] = useState(false);
const [draftQuery, setDraftQuery] = useState(query);
  const [draft, setDraft] = useState(() => ({
    minBudget: filters.minBudget,
    budget: filters.budget,
    category: filters.category,
    order: filters.order,
    openNow: filters.openNow,
  }));
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    setDraft({
      minBudget: filters.minBudget,
      budget: filters.budget,
      category: filters.category,
      order: filters.order,
      openNow: filters.openNow,
    });
  }, [filters]);

  const updateBudget = (range: { minBudget: number; budget: number | null }) => {
    setDraft((current) => ({ ...current, ...range }));
  };
  const commitBudget = () => {
    const current = draftRef.current;
    onFiltersChange({
      minBudget: current.minBudget,
      budget: current.budget,
      page: 1,
    });
  };
  const count = activeCount({ ...filters, ...draft, q: sheetOpen ? draftQuery : query });

  return (
    <div data-testid="discovery-search" className="space-y-3">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-carbon/60" />
        <label htmlFor="descubrir-q" className="sr-only">Buscar comida</label>
        <Input
          id="descubrir-q"
          type="search"
          value={query}
          maxLength={80}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar comida..."
          className="h-14 rounded-pill border-0 bg-cream pl-12 shadow-[0_4px_18px_rgba(43,43,43,0.12)]"
        />
        {query ? (
          <button type="button" aria-label="Limpiar texto de búsqueda" onClick={() => onQueryChange("")} className="absolute top-1/2 right-3 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-pill text-carbon/70">
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 rounded-card bg-cream p-3 shadow-sm">
        <WalletCards aria-hidden="true" className="size-5 shrink-0 text-antojo" />
        <span className="shrink-0 text-sm font-semibold text-carbon">Presupuesto:</span>
        <BudgetRange
          min={draft.minBudget}
          max={draft.budget}
          onChange={updateBudget}
          onCommit={commitBudget}
        />
        <button type="button" aria-label="Abrir filtros avanzados" onClick={() => { setDraftQuery(query); setSheetOpen(true); }} className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill bg-antojo text-carbon hover:bg-antojo/80">
          <SlidersHorizontal aria-hidden="true" className="size-5" />
        </button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" showClose={false} className="max-h-[90dvh] overflow-y-auto rounded-t-[1.5rem] p-5">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-pill bg-carbon/25" />
          <DialogTitle>Filtros Avanzados</DialogTitle>
          <DialogDescription className="sr-only">Filtra el catálogo por búsqueda, presupuesto, categoría y orden.</DialogDescription>
          <div className="mt-5 space-y-5">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-carbon/60" />
              <Input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Buscar comida..." className="pl-9" />
            </div>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Presupuesto</h3>
              <BudgetRange min={draft.minBudget} max={draft.budget} onChange={updateBudget} />
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Categorías</h3>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((category) => {
                  const selected = draft.category.includes(category);
                  return (
                    <button key={category} type="button" aria-pressed={selected} onClick={() => setDraft((current) => ({ ...current, category: selected ? current.category.filter((value) => value !== category) : [...current.category, category] }))} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-panel border-2 p-2 text-center text-xs ${selected ? "border-antojo bg-antojo/15" : "border-carbon/15 bg-cream"}`}>
                      <CategoryIcon category={category} />
                      {category}
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Ordenar por</h3>
              <div className="space-y-2">
                {ORDER_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="discovery-order" value={option.value} checked={draft.order === option.value} onChange={() => setDraft((current) => ({ ...current, order: option.value }))} />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.openNow}
                onChange={(event) => setDraft((current) => ({ ...current, openNow: event.target.checked }))}
              />
              Abierto ahora
            </label>
            <button type="button" className="w-full rounded-pill bg-antojo px-4 py-3 font-semibold text-carbon" onClick={() => {
              onQueryChange(draftQuery);
              onFiltersChange({ q: draftQuery, minBudget: draft.minBudget, budget: draft.budget, category: draft.category, order: draft.order, openNow: draft.openNow, page: 1 });
              setSheetOpen(false);
            }}>
              Aplicar Filtros ({count})
            </button>
            {hasActiveDiscoveryFilters({ ...filters, ...draft, q: query }) ? (
              <button type="button" onClick={onClear} className="w-full text-sm font-semibold underline">Limpiar filtros</button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
