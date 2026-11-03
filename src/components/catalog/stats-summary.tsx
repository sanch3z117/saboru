import { formatRating } from "@/lib/format";
import { statsAverage } from "@/lib/reviews/stats";
import { cn } from "@/lib/utils";
import type { ProductStatsRow } from "@/types/catalog";

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
    <p className={cn("text-sm text-carbon/75", className)}>
      <span className="font-display text-base font-semibold text-carbon">
        {formatRating(average)}
      </span>{" "}
      / 5 · {stats.review_count ?? 0} reseñas
    </p>
  );
}
