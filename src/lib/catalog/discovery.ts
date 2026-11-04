import type { CatalogOrder } from "./search";

export const DISCOVERY_PAGE_SIZE = 50;
export const MIN_TOTAL = 0;
export const MAX_TOTAL = 14000;
export const STEP = 500;
export const BUDGET_MIN_COP = MIN_TOTAL;
export const BUDGET_MAX_COP = MAX_TOTAL;
export const BUDGET_STEP_COP = STEP;
export const DEFAULT_CATALOG_ORDER: CatalogOrder = "distance";
export const ORDER_OPTIONS: { value: CatalogOrder; label: string }[] = [
  { value: "distance", label: "Más cerca" },
  { value: "price", label: "Más barato" },
  { value: "rating", label: "Mejor valorados" },
];

export type DiscoveryFilters = {
  q: string;
  category: string[];
  minBudget: number;
  budget: number | null;
  openNow: boolean;
  order: CatalogOrder;
  page: number;
  blockId: string | null;
};

function roundToStep(value: number) {
  return Math.round(value / STEP) * STEP;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeBudgetRange(
  minValue: number | null | undefined,
  maxValue: number | null | undefined,
) {
  const min = clamp(
    roundToStep(Number.isFinite(minValue) ? Number(minValue) : MIN_TOTAL),
    MIN_TOTAL,
    MAX_TOTAL - STEP,
  );
  const max = maxValue === null ||
    maxValue === undefined ||
    !Number.isFinite(maxValue) ||
    maxValue < MIN_TOTAL
    ? null
    : clamp(roundToStep(Number(maxValue)), min + STEP, MAX_TOTAL);
  return { minBudget: min, budget: max === MAX_TOTAL ? null : max };
}

export function parseBudgetValue(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= STEP
    ? normalizeBudgetRange(0, parsed).budget
    : null;
}

export function budgetForSlider(value: number | null) {
  return value === null ? MAX_TOTAL : normalizeBudgetRange(0, value).budget ?? MAX_TOTAL;
}

function parseOrder(value: string | null): CatalogOrder {
  return value === "price" || value === "rating" ? value : "distance";
}

function parsePage(value: string | null) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

/** Lee el estado compartible de la URL; los valores inválidos se ignoran. */
export function parseDiscoveryFilters(
  params: Readonly<URLSearchParams>,
): DiscoveryFilters {
  const categories = params
    .getAll("categoria")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().slice(0, 50))
    .filter(Boolean);
  const rawMax = params.get("presupuesto");
  const range = normalizeBudgetRange(
    Number.parseInt(params.get("presupuesto_desde") ?? "0", 10),
    rawMax === null ? null : Number.parseInt(rawMax, 10),
  );
  return {
    q: (params.get("q") ?? "").trim().slice(0, 80),
    category: [...new Set(categories)],
    ...range,
    openNow: params.get("abierto") === "1",
    order: parseOrder(params.get("orden")),
    page: parsePage(params.get("pagina")),
    blockId: params.get("bloque")?.trim() || null,
  };
}

/** Serializa solo lo que no es el estado por defecto. */
export function discoverySearchParams(filters: DiscoveryFilters) {
  const params = new URLSearchParams();
  const q = filters.q.trim();
  if (q) params.set("q", q);
  if (filters.category.length) {
    filters.category.forEach((category) => params.append("categoria", category));
  }
  const range = normalizeBudgetRange(filters.minBudget, filters.budget);
  if (range.minBudget > MIN_TOTAL) {
    params.set("presupuesto_desde", String(range.minBudget));
  }
  if (range.budget !== null) params.set("presupuesto", String(range.budget));
  if (filters.openNow) params.set("abierto", "1");
  if (filters.order !== DEFAULT_CATALOG_ORDER) {
    params.set("orden", filters.order);
  }
  if (filters.page > 1) params.set("pagina", String(filters.page));
  if (filters.blockId) params.set("bloque", filters.blockId);
  return params;
}

export function hasActiveDiscoveryFilters(filters: DiscoveryFilters) {
  return Boolean(
    filters.q ||
    filters.category.length > 0 ||
    filters.minBudget > MIN_TOTAL ||
    filters.budget !== null ||
    filters.openNow ||
    filters.order !== DEFAULT_CATALOG_ORDER ||
    filters.page > 1,
  );
}
