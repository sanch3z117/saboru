import { formatDate, formatRating } from "@/lib/format";
import { reviewAverage } from "@/lib/reviews/stats";
import type { PublicReviewRow } from "@/types/catalog";

import { ReportForm } from "@/components/reviews/report-form";

export function ReviewList({
  reviews,
  canReport = false,
  ownReviewIds = [],
}: {
  reviews: PublicReviewRow[];
  canReport?: boolean;
  ownReviewIds?: string[];
}) {
  if (reviews.length === 0) {
    return (
      <p className="mt-4 text-base text-carbon/70">
        Todavía no hay reseñas publicadas. Vuelve cuando la comunidad haya
        comido aquí.
      </p>
    );
  }

  return (
    <ul className="mt-4">
      {reviews.map((review) => {
        const isOwn = ownReviewIds.includes(review.id);

        return (
          <li key={review.id} className="border-b border-carbon/15 py-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-display text-base font-semibold">
                {formatRating(reviewAverage(review))} / 5
              </span>
              <span className="text-carbon/60">
                {formatDate(review.created_at)}
              </span>
              <span className="bg-verified-soft px-2 py-0.5 text-xs font-semibold text-verified-ink">
                Reseña verificada
              </span>
              {isOwn ? (
                <span className="text-xs font-semibold text-carbon/70">
                  Tu reseña
                </span>
              ) : null}
            </div>
            {review.comment ? (
              <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-carbon/85">
                {review.comment}
              </p>
            ) : null}
            {canReport && !isOwn ? (
              <div className="mt-2">
                <ReportForm reviewId={review.id} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
