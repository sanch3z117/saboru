import { distanceMeters, type Coordinates } from "./distance";
import { isOpenAt, type WeeklySchedule } from "./schedule";

export type CatalogSearchItem = {
  id: string;
  establishment_id: string;
  name: string;
  description: string;
  price_cop: number;
  category: string;
  photo_url: string | null;
  available: boolean;
  allergens: string[];
  establishment_name: string;
  establishment_slug: string;
  establishment_schedule: WeeklySchedule | null;
  establishment_description?: string | null;
  establishment_latitude?: number | null;
  establishment_longitude?: number | null;
  establishment_rating?: number | null;
  establishment_review_count?: number | null;
  distance_m: number;
};

export type CatalogOrder = "distance" | "price" | "rating";

export type CatalogFilters = {
  minBudget?: number;
  budget: number | null;
  category: string[] | string | null;
  maxDistanceM: number | null;
  openNow: boolean;
  q?: string | null;
  order?: CatalogOrder;
  origin?: Coordinates | null;
  now?: Date;
  timeZone?: string;
};

export type CatalogPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function matchesCatalogQuery(
  item: CatalogSearchItem,
  q: string | null | undefined,
) {
  const needle = normalizeSearchText(q ?? "");
  if (!needle) return true;

  const haystack = normalizeSearchText(
    [
      item.name,
      item.description,
      item.establishment_name,
      item.establishment_description ?? "",
      item.category,
    ].join(" "),
  );

  return needle
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

/** Usa las coordenadas del ítem si existen; si no, la distancia ya calculada. */
export function distanceForCatalogItem(
  item: CatalogSearchItem,
  origin?: Coordinates | null,
) {
  const latitude = item.establishment_latitude;
  const longitude = item.establishment_longitude;

  if (
    origin &&
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return distanceMeters(origin, { latitude, longitude });
  }

  return item.distance_m;
}

export function compareCatalogItems(
  a: CatalogSearchItem,
  b: CatalogSearchItem,
  order: CatalogOrder = "distance",
  origin?: Coordinates | null,
) {
  if (order === "rating") {
    const ratingA = a.establishment_rating ?? null;
    const ratingB = b.establishment_rating ?? null;

    if (ratingA !== ratingB) {
      if (ratingA === null) return 1;
      if (ratingB === null) return -1;
      return ratingB - ratingA;
    }
  }

  if (order === "price" && a.price_cop !== b.price_cop) {
    return a.price_cop - b.price_cop;
  }

  const distanceA = distanceForCatalogItem(a, origin);
  const distanceB = distanceForCatalogItem(b, origin);
  if (distanceA !== distanceB) {
    return distanceA - distanceB;
  }

  return a.price_cop - b.price_cop;
}

export function filterCatalog(
  items: CatalogSearchItem[],
  filters: CatalogFilters,
): CatalogSearchItem[] {
  const now = filters.now ?? new Date();
  const timeZone = filters.timeZone ?? "America/Bogota";

  return items.filter((item) => {
    if (!matchesCatalogQuery(item, filters.q)) {
      return false;
    }

    if ((filters.minBudget ?? 0) > 0 && item.price_cop < (filters.minBudget ?? 0)) {
      return false;
    }

    if (filters.budget !== null && item.price_cop > filters.budget) {
      return false;
    }

    if (
      filters.maxDistanceM !== null &&
      distanceForCatalogItem(item, filters.origin) > filters.maxDistanceM
    ) {
      return false;
    }

    if (
      filters.category !== null &&
      filters.category.length > 0 &&
      (Array.isArray(filters.category)
        ? !filters.category.includes(item.category)
        : filters.category !== item.category)
    ) {
      return false;
    }

    if (
      filters.openNow &&
      !isOpenAt(item.establishment_schedule, now, timeZone)
    ) {
      return false;
    }

    return true;
  });
}

export function searchCatalog(
  items: CatalogSearchItem[],
  filters: CatalogFilters,
): CatalogSearchItem[] {
  const order = filters.order ?? "distance";

  return filterCatalog(items, filters).sort((a, b) =>
    compareCatalogItems(a, b, order, filters.origin),
  );
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): CatalogPage<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}
