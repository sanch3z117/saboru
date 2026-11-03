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
  distance_m: number;
  establishment_schedule: WeeklySchedule | null;
};

export type CatalogFilters = {
  budget: number | null;
  category: string | null;
  maxDistanceM: number | null;
  openNow: boolean;
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

export function compareCatalogItems(
  a: CatalogSearchItem,
  b: CatalogSearchItem,
) {
  if (a.distance_m !== b.distance_m) {
    return a.distance_m - b.distance_m;
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
    if (filters.budget !== null && item.price_cop > filters.budget) {
      return false;
    }

    if (
      filters.maxDistanceM !== null &&
      item.distance_m > filters.maxDistanceM
    ) {
      return false;
    }

    if (filters.category !== null && item.category !== filters.category) {
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
  return filterCatalog(items, filters).sort(compareCatalogItems);
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
