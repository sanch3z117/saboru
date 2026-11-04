import { distanceMeters, type Coordinates } from "@/lib/catalog/distance";
import { aggregateEstablishmentRating } from "@/lib/catalog/rating";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import type { CatalogSnapshot } from "@/types/catalog";

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

export type SearchPlaceGroup = {
  place: MapPlace;
  items: CatalogSearchItem[];
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

/**
 * Convierte el snapshot público en los lugares del mapa. Es una función pura:
 * rating, precio y distancia salen de las mismas reglas que la lista.
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
      const aggregate = aggregateEstablishmentRating(
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
          rating: aggregate.rating,
          reviewCount: aggregate.reviewCount,
          distanceMeters: distanceMeters(origin, {
            latitude,
            longitude,
          }),
        } satisfies MapPlace,
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/**
 * Agrupa los productos filtrados por local. El orden de los grupos sigue el
 * orden de los resultados (distancia, precio o rating), y el precio mostrado es
 * el mínimo de los productos que coinciden con los filtros.
 */
export function groupSearchItemsByPlace(
  snapshot: Pick<CatalogSnapshot, "establishments">,
  items: readonly CatalogSearchItem[],
): SearchPlaceGroup[] {
  const establishments = new Map(
    snapshot.establishments.map((establishment) => [
      establishment.id,
      establishment,
    ]),
  );
  const groups = new Map<string, SearchPlaceGroup>();

  for (const item of items) {
    const existing = groups.get(item.establishment_id);
    if (existing) {
      existing.items.push(item);
      existing.place.priceFromCop = Math.min(
        existing.place.priceFromCop ?? item.price_cop,
        item.price_cop,
      );
      existing.place.distanceMeters = Math.min(
        existing.place.distanceMeters,
        item.distance_m,
      );
      continue;
    }

    const establishment = establishments.get(item.establishment_id);
    const latitude = establishment?.latitude ?? item.establishment_latitude;
    const longitude = establishment?.longitude ?? item.establishment_longitude;

    if (
      latitude === null ||
      longitude === null ||
      latitude === undefined ||
      longitude === undefined ||
      !isValidCoordinate(latitude, longitude)
    ) {
      continue;
    }

    groups.set(item.establishment_id, {
      place: {
        id: item.establishment_id,
        slug: item.establishment_slug,
        name: item.establishment_name,
        category: establishment?.category ?? item.category,
        plan: establishment?.plan ?? "basic",
        latitude,
        longitude,
        photoPath: establishment?.photos?.[0] ?? null,
        priceFromCop: item.price_cop,
        rating: item.establishment_rating ?? null,
        reviewCount: item.establishment_review_count ?? 0,
        distanceMeters: item.distance_m,
      },
      items: [item],
    });
  }

  return [...groups.values()];
}

export function placesForSearchItems(
  snapshot: Pick<CatalogSnapshot, "establishments">,
  items: readonly CatalogSearchItem[],
) {
  return groupSearchItemsByPlace(snapshot, items).map((group) => group.place);
}
