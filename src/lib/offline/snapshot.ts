import type { WeeklySchedule } from "@/lib/catalog/schedule";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import { distanceMeters, type Coordinates } from "@/lib/catalog/distance";
import type { CatalogSnapshot } from "@/types/catalog";

/**
 * Convierte el snapshot público (establecimientos + productos) en los mismos
 * `CatalogSearchItem` que devuelve `search_products`. La distancia se calcula
 * con haversine desde el bloque elegido y se conserva `establishment_schedule`
 * para el filtro "abierto ahora".
 */
export function snapshotToSearchItems(
  snapshot: Pick<CatalogSnapshot, "establishments" | "products">,
  block: Coordinates,
): CatalogSearchItem[] {
  const establishments = new Map(
    snapshot.establishments.map((establishment) => [
      establishment.id,
      establishment,
    ]),
  );

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
      distance_m: distanceMeters(block, {
        latitude: establishment.latitude,
        longitude: establishment.longitude,
      }),
      establishment_schedule:
        (establishment.schedule as WeeklySchedule | null) ?? null,
    });
  }

  return items;
}
