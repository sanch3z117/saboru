import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OwnReview } from "@/types/reviews";

export async function getReviewContext(productId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { hasSession: false, canReview: false, ownReview: null };
  }

  const { data: institutional } = await supabase.rpc(
    "is_institutional_student",
  );
  const canReview = Boolean(institutional);

  if (!canReview) {
    return { hasSession: true, canReview: false, ownReview: null };
  }

  const { data } = await supabase
    .from("reviews")
    .select(
      "id, rating_sabor, rating_cantidad, rating_precio, rating_presentacion, rating_calidad_precio, comment, created_at",
    )
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  return {
    hasSession: true,
    canReview: true,
    ownReview: (data as OwnReview | null) ?? null,
  };
}
