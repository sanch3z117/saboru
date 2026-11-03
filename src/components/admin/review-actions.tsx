import { Button } from "@/components/ui/button";
import { setReviewStatusAction } from "@/server/actions/admin";

export function ReviewActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const nextStatus = status === "published" ? "hidden" : "published";

  return (
    <form action={setReviewStatusAction} className="w-full sm:w-auto">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="status" value={nextStatus} />
      <Button type="submit" size="sm" variant="secondary">
        {nextStatus === "hidden" ? "Ocultar reseña" : "Publicar reseña"}
      </Button>
    </form>
  );
}
