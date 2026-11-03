import "server-only";

import type { AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { OwnReview } from "@/types/reviews";

export type ReviewViewer = {
  userId: string;
  email: string;
  role: AppRole;
  canReview: boolean;
};

export async function getReviewContext(productId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      hasSession: false,
      canReview: false,
      ownReview: null,
      viewer: null,
    };
  }

  const [institutionalResult, profileResult] = await Promise.all([
    supabase.rpc("is_institutional_student"),
    supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single(),
  ]);

  const canReview = Boolean(institutionalResult.data);
  const viewer: ReviewViewer = {
    userId: user.id,
    email: profileResult.data?.email ?? user.email ?? "",
    role: (profileResult.data?.role ?? "student") as AppRole,
    canReview,
  };

  if (!canReview) {
    return { hasSession: true, canReview: false, ownReview: null, viewer };
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
    viewer,
  };
}
