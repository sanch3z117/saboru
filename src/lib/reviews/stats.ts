export type ReviewRatings = {
  rating_sabor: number;
  rating_cantidad: number;
  rating_precio: number;
  rating_presentacion: number;
  rating_calidad_precio: number;
};

export type StatsAverages = {
  review_count: number | null;
  avg_sabor: number | string | null;
  avg_cantidad: number | string | null;
  avg_precio: number | string | null;
  avg_presentacion: number | string | null;
  avg_calidad_precio: number | string | null;
};

export function reviewAverage(review: ReviewRatings): number {
  return (
    (review.rating_sabor +
      review.rating_cantidad +
      review.rating_precio +
      review.rating_presentacion +
      review.rating_calidad_precio) /
    5
  );
}

export function statsAverage(stats: StatsAverages | null | undefined) {
  if (!stats || (stats.review_count ?? 0) < 5) return null;

  const average =
    (Number(stats.avg_sabor) +
      Number(stats.avg_cantidad) +
      Number(stats.avg_precio) +
      Number(stats.avg_presentacion) +
      Number(stats.avg_calidad_precio)) /
    5;

  return Number.isFinite(average) ? average : null;
}
