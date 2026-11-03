import { formatDate, formatRating } from "@/lib/format";
import type { PublicReviewRow } from "@/types/catalog";

function reviewAverage(review: PublicReviewRow) {
  return (
    (review.rating_sabor +
      review.rating_cantidad +
      review.rating_precio +
      review.rating_presentacion +
      review.rating_calidad_precio) /
    5
  );
}

export function ReviewList({ reviews }: { reviews: PublicReviewRow[] }) {
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
      {reviews.map((review) => (
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
          </div>
          {review.comment ? (
            <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-carbon/85">
              {review.comment}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
