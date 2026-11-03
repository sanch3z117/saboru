import { cn } from "@/lib/utils";
import { formatRating } from "@/lib/format";
import type { ProductStatsRow } from "@/types/catalog";

export function StatsSummary({
  stats,
  className,
}: {
  stats: ProductStatsRow | null | undefined;
  className?: string;
}) {
  if (!stats || (stats.review_count ?? 0) < 5) {
    return (
      <p className={cn("text-sm text-carbon/70", className)}>
        Aún no hay suficientes reseñas
      </p>
    );
  }

  const count = stats.review_count ?? 0;
  const average =
    (Number(stats.avg_sabor) +
      Number(stats.avg_cantidad) +
      Number(stats.avg_precio) +
      Number(stats.avg_presentacion) +
      Number(stats.avg_calidad_precio)) /
    5;

  return (
    <p className={cn("text-sm text-carbon/75", className)}>
      <span className="font-display text-base font-semibold text-carbon">
        {formatRating(average)}
      </span>{" "}
      / 5 · {count} reseñas
    </p>
  );
}
