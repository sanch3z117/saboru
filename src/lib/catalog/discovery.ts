import type { CatalogOrder } from "./search";

export const DISCOVERY_PAGE_SIZE = 50;
export const DEFAULT_CATALOG_ORDER: CatalogOrder = "distance";
export const ORDER_OPTIONS: { value: CatalogOrder; label: string }[] = [
  { value: "distance", label: "Más cerca" },
  { value: "price", label: "Más barato" },
  { value: "rating", label: "Mejor valorados" },
];

export type DiscoveryFilters = {
  q: string;
  category: string | null;
  budget: number | null;
  openNow: boolean;
  order: CatalogOrder;
  page: number;
  blockId: string | null;
};

export function parseBudgetValue(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
  return {
    q: (params.get("q") ?? "").trim().slice(0, 80),
    category: params.get("categoria")?.trim().slice(0, 50) || null,
    budget: parseBudgetValue(params.get("presupuesto")),
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
  if (filters.category) params.set("categoria", filters.category);
  if (filters.budget !== null) {
    params.set("presupuesto", String(filters.budget));
  }
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
    filters.category ||
    filters.budget !== null ||
    filters.openNow ||
    filters.order !== DEFAULT_CATALOG_ORDER ||
    filters.page > 1,
  );
}
