import { Star, StarHalf } from "lucide-react";

import { formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  reviewCount,
  showCount = true,
  size = "md",
  className,
}: {
  value: number | null | undefined;
  reviewCount?: number | null;
  showCount?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  if (value === null || value === undefined) {
    return (
      <span className={cn("text-sm text-carbon/60", className)}>
        Sin reseñas suficientes
      </span>
    );
  }

  const rounded = Math.round(value * 2) / 2;
  const label = `${formatRating(value)} de 5${
    reviewCount === null || reviewCount === undefined
      ? ""
      : `, ${reviewCount} ${reviewCount === 1 ? "reseña" : "reseñas"}`
  }`;
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          if (rounded >= star) {
            return (
              <Star
                key={star}
                className={cn(iconSize, "fill-antojo text-antojo")}
              />
            );
          }
          if (rounded >= star - 0.5) {
            return (
              <StarHalf
                key={star}
                className={cn(iconSize, "fill-antojo text-antojo")}
              />
            );
          }
          return (
            <Star
              key={star}
              className={cn(iconSize, "fill-transparent text-carbon/25")}
            />
          );
        })}
      </span>
      {showCount ? (
        <span className="text-xs font-semibold text-carbon/75">
          {formatRating(value)}
          {reviewCount !== null && reviewCount !== undefined ? (
            <span className="font-normal text-carbon/55"> ({reviewCount})</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
