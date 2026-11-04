import { distanceMeters, type Coordinates } from "@/lib/catalog/distance";
import type { CatalogSnapshot, ProductStatsRow } from "@/types/catalog";

import {
  CAMPUS_BOUNDS_PADDING,
  CAMPUS_CENTER,
  FALLBACK_CAMPUS_BOUNDS,
  type MapBounds,
} from "./config";

export type MapPlace = {
  id: string;
  slug: string;
  name: string;
  category: string;
  plan: string;
  latitude: number;
  longitude: number;
  photoPath: string | null;
  priceFromCop: number | null;
  rating: number | null;
  reviewCount: number;
  distanceMeters: number;
};

type BlockPoint = {
  latitude: number | null;
  longitude: number | null;
};

function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Bounds del campus a partir de los bloques del snapshot. Si no hay bloques
 * válidos, usa el rectángulo de respaldo documentado en `config.ts`.
 */
export function campusBoundsFromBlocks(
  blocks: readonly BlockPoint[],
  padding = CAMPUS_BOUNDS_PADDING,
): MapBounds {
  const points = blocks.filter(
    (block): block is { latitude: number; longitude: number } =>
      block.latitude !== null &&
      block.longitude !== null &&
      isValidCoordinate(block.latitude, block.longitude),
  );

  if (points.length === 0) {
    return FALLBACK_CAMPUS_BOUNDS;
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);

  return [
    [Math.min(...longitudes) - padding, Math.min(...latitudes) - padding],
    [Math.max(...longitudes) + padding, Math.max(...latitudes) + padding],
  ];
}

function statsForEstablishment(
  stats: readonly ProductStatsRow[],
  productIds: ReadonlySet<string>,
) {
  let reviewCount = 0;
  let weightedTotal = 0;

  for (const stat of stats) {
    if (!productIds.has(stat.product_id)) continue;

    const count = stat.review_count ?? 0;
    if (count <= 0) continue;

    const criteria = [
      stat.avg_sabor,
      stat.avg_cantidad,
      stat.avg_precio,
      stat.avg_presentacion,
      stat.avg_calidad_precio,
    ].filter((value): value is number => typeof value === "number");

    if (criteria.length === 0) continue;

    const productAverage =
      criteria.reduce((sum, value) => sum + value, 0) / criteria.length;
    weightedTotal += productAverage * count;
    reviewCount += count;
  }

  return {
    rating:
      reviewCount > 0
        ? Math.round((weightedTotal / reviewCount) * 10) / 10
        : null,
    reviewCount,
  };
}

/**
 * Convierte el snapshot público en los lugares del mapa. Es una función pura:
 * el mapa, la lista y (en 7.5.2) la búsqueda usan el mismo dato y la misma
 * distancia haversine.
 */
export function placesFromSnapshot(
  snapshot: CatalogSnapshot,
  origin: Coordinates = CAMPUS_CENTER,
): MapPlace[] {
  const productsByEstablishment = new Map<
    string,
    { id: string; price: number }[]
  >();

  for (const product of snapshot.products) {
    if (!product.available) continue;
    const list = productsByEstablishment.get(product.establishment_id) ?? [];
    list.push({ id: product.id, price: product.price_cop });
    productsByEstablishment.set(product.establishment_id, list);
  }

  return snapshot.establishments
    .flatMap((establishment) => {
      const latitude = establishment.latitude;
      const longitude = establishment.longitude;

      if (
        latitude === null ||
        longitude === null ||
        !isValidCoordinate(latitude, longitude)
      ) {
        return [];
      }

      const products = productsByEstablishment.get(establishment.id) ?? [];
      const productIds = new Set(products.map((product) => product.id));
      const { rating, reviewCount } = statsForEstablishment(
        snapshot.product_stats,
        productIds,
      );

      return [
        {
          id: establishment.id,
          slug: establishment.slug,
          name: establishment.name,
          category: establishment.category,
          plan: establishment.plan,
          latitude,
          longitude,
          photoPath: establishment.photos?.[0] ?? null,
          priceFromCop:
            products.length > 0
              ? Math.min(...products.map((product) => product.price))
              : null,
          rating,
          reviewCount,
          distanceMeters: distanceMeters(origin, {
            latitude,
            longitude,
          }),
        } satisfies MapPlace,
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
