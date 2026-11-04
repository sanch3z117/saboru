import type { ProductStatsRow } from "@/types/catalog";

/** Mínimo de reseñas publicado para mostrar un promedio (docs/06). */
export const MIN_REVIEWS_FOR_RATING = 5;

export type AggregateRating = {
  rating: number | null;
  reviewCount: number;
};

export function productAverageRating(stat: ProductStatsRow): number | null {
  const reviewCount = stat.review_count ?? 0;
  if (reviewCount < MIN_REVIEWS_FOR_RATING) {
    return null;
  }

  const criteria = [
    stat.avg_sabor,
    stat.avg_cantidad,
    stat.avg_precio,
    stat.avg_presentacion,
    stat.avg_calidad_precio,
  ].filter((value): value is number => typeof value === "number");

  if (criteria.length === 0) {
    return null;
  }

  return criteria.reduce((sum, value) => sum + value, 0) / criteria.length;
}

/**
 * Rating de un local: promedio simple de los productos que alcanzan el mínimo
 * de reseñas. Los productos con menos de 5 no cuentan y, si ninguno califica,
 * el local queda sin rating. Se usa igual en mapa, lista y ficha rápida.
 */
export function aggregateEstablishmentRating(
  stats: readonly ProductStatsRow[],
  productIds: ReadonlySet<string>,
): AggregateRating {
  let ratingTotal = 0;
  let ratedProducts = 0;
  let reviewCount = 0;

  for (const stat of stats) {
    if (!productIds.has(stat.product_id)) continue;

    const average = productAverageRating(stat);
    if (average === null) continue;

    ratingTotal += average;
    ratedProducts += 1;
    reviewCount += stat.review_count ?? 0;
  }

  return {
    rating:
      ratedProducts > 0
        ? Math.round((ratingTotal / ratedProducts) * 100) / 100
        : null,
    reviewCount,
  };
}
