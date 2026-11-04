import type { WeeklySchedule } from "@/lib/catalog/schedule";
import {
  aggregateEstablishmentRating,
  type AggregateRating,
} from "@/lib/catalog/rating";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import { distanceMeters, type Coordinates } from "@/lib/catalog/distance";
import type { CatalogSnapshot, ProductStatsRow } from "@/types/catalog";

type SnapshotForSearch = Pick<
  CatalogSnapshot,
  "establishments" | "products"
> & {
  product_stats?: readonly ProductStatsRow[];
};

/**
 * Convierte el snapshot público (establecimientos + productos) en los mismos
 * `CatalogSearchItem` que devuelve `search_products`. La distancia se calcula
 * con haversine desde el origen (bloque o ubicación del usuario) y se conserva
 * `establishment_schedule` para el filtro "abierto ahora".
 */
export function snapshotToSearchItems(
  snapshot: SnapshotForSearch,
  origin: Coordinates,
): CatalogSearchItem[] {
  const establishments = new Map(
    snapshot.establishments.map((establishment) => [
      establishment.id,
      establishment,
    ]),
  );

  const productIdsByEstablishment = new Map<string, Set<string>>();
  for (const product of snapshot.products) {
    if (!product.available) continue;
    const ids =
      productIdsByEstablishment.get(product.establishment_id) ?? new Set();
    ids.add(product.id);
    productIdsByEstablishment.set(product.establishment_id, ids);
  }

  const ratingByEstablishment = new Map<string, AggregateRating>();
  for (const [establishmentId, productIds] of productIdsByEstablishment) {
    ratingByEstablishment.set(
      establishmentId,
      aggregateEstablishmentRating(snapshot.product_stats ?? [], productIds),
    );
  }

  const items: CatalogSearchItem[] = [];

  for (const product of snapshot.products) {
    if (!product.available) {
      continue;
    }

    const establishment = establishments.get(product.establishment_id);
    if (
      !establishment ||
      establishment.latitude === null ||
      establishment.longitude === null
    ) {
      continue;
    }

    const aggregate = ratingByEstablishment.get(establishment.id) ?? {
      rating: null,
      reviewCount: 0,
    };

    items.push({
      id: product.id,
      establishment_id: product.establishment_id,
      name: product.name,
      description: product.description,
      price_cop: product.price_cop,
      category: product.category,
      photo_url: product.photo_url,
      available: product.available,
      allergens: product.allergens,
      establishment_name: establishment.name,
      establishment_slug: establishment.slug,
      establishment_schedule:
        (establishment.schedule as WeeklySchedule | null) ?? null,
      establishment_description: establishment.description,
      establishment_latitude: establishment.latitude,
      establishment_longitude: establishment.longitude,
      establishment_rating: aggregate.rating,
      establishment_review_count: aggregate.reviewCount,
      distance_m: distanceMeters(origin, {
        latitude: establishment.latitude,
        longitude: establishment.longitude,
      }),
    });
  }

  return items;
}
