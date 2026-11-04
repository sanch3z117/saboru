import type { ProductStatsRow } from "@/types/catalog";

import { RatingStars } from "./rating-stars";

const CRITERIA = [
  { key: "avg_sabor", label: "Sabor" },
  { key: "avg_cantidad", label: "Cantidad" },
  { key: "avg_precio", label: "Precio" },
  { key: "avg_presentacion", label: "Presentación" },
  { key: "avg_calidad_precio", label: "Calidad/precio" },
] as const;

export function CriteriaRatings({
  stats,
}: {
  stats: ProductStatsRow | null | undefined;
}) {
  if (!stats || (stats.review_count ?? 0) < 5) {
    return (
      <p className="text-sm text-carbon/70">Aún no hay suficientes reseñas</p>
    );
  }

  return (
    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
      {CRITERIA.map((criterion) => {
        const value = stats[criterion.key];
        return (
          <div
            key={criterion.key}
            className="flex items-center justify-between gap-3 border-b border-carbon/10 py-1.5"
          >
            <dt className="text-sm text-carbon/70">{criterion.label}</dt>
            <dd>
              <RatingStars
                value={typeof value === "number" ? value : Number(value)}
                reviewCount={stats.review_count ?? 0}
                showCount={false}
                size="sm"
              />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
