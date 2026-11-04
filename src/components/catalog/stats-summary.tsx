import { statsAverage } from "@/lib/reviews/stats";
import { cn } from "@/lib/utils";
import type { ProductStatsRow } from "@/types/catalog";

import { RatingStars } from "./rating-stars";

export function StatsSummary({
  stats,
  className,
}: {
  stats: ProductStatsRow | null | undefined;
  className?: string;
}) {
  const average = statsAverage(stats);

  if (average === null || !stats) {
    return (
      <p className={cn("text-sm text-carbon/70", className)}>
        Aún no hay suficientes reseñas
      </p>
    );
  }

  return (
    <div className={cn("text-sm text-carbon/75", className)}>
      <RatingStars
        value={average}
        reviewCount={stats.review_count ?? 0}
        size="sm"
      />
    </div>
  );
}
