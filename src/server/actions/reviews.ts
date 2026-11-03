"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import { reviewErrorMessage } from "@/lib/reviews/errors";
import {
  createReviewSchema,
  reportReviewSchema,
  updateReviewSchema,
} from "@/lib/validations/review";
import { createClient } from "@/lib/supabase/server";
import {
  createReview,
  reportReview,
  updateReview,
} from "@/server/services/reviews";

export type ReviewFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Revisa el formulario.";
}

function readRatings(formData: FormData) {
  return {
    rating_sabor: formData.get("rating_sabor"),
    rating_cantidad: formData.get("rating_cantidad"),
    rating_precio: formData.get("rating_precio"),
    rating_presentacion: formData.get("rating_presentacion"),
    rating_calidad_precio: formData.get("rating_calidad_precio"),
  };
}

function revalidateCatalog(productId: string, establishmentSlug: unknown) {
  revalidatePath(`/producto/${productId}`);
  if (typeof establishmentSlug === "string" && establishmentSlug.length > 0) {
    revalidatePath(`/establecimiento/${establishmentSlug}`);
  }
}

export async function saveReviewAction(
  state: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  if (formData.get("reviewId")) {
    return updateReviewAction(state, formData);
  }
  return createReviewAction(state, formData);
}

export async function createReviewAction(
  _state: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: reviewErrorMessage("unauthorized") };
  }

  const parsed = createReviewSchema.safeParse({
    productId: formData.get("productId"),
    establishmentId: formData.get("establishmentId"),
    clientId: formData.get("clientId"),
    comment: formData.get("comment") ?? "",
    ...readRatings(formData),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const limit = await checkRateLimit("review", user.id);
  if (!limit.success) {
    return { status: "error", message: reviewErrorMessage("rate_limited") };
  }

  const result = await createReview(supabase, parsed.data);
  if (!result.ok) {
    return { status: "error", message: reviewErrorMessage(result.code) };
  }

  revalidateCatalog(parsed.data.productId, formData.get("establishmentSlug"));

  return {
    status: "success",
    message: result.duplicate
      ? "Esta reseña ya estaba guardada."
      : "¡Gracias! Tu reseña quedó publicada.",
  };
}

export async function updateReviewAction(
  _state: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: reviewErrorMessage("unauthorized") };
  }

  const parsed = updateReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
    comment: formData.get("comment") ?? "",
    ...readRatings(formData),
  });
  const productId = z.uuid().safeParse(formData.get("productId"));

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  if (!productId.success) {
    return { status: "error", message: reviewErrorMessage("invalid") };
  }

  const limit = await checkRateLimit("review", user.id);
  if (!limit.success) {
    return { status: "error", message: reviewErrorMessage("rate_limited") };
  }

  const result = await updateReview(supabase, parsed.data);
  if (!result.ok) {
    return { status: "error", message: reviewErrorMessage(result.code) };
  }

  revalidateCatalog(productId.data, formData.get("establishmentSlug"));

  return { status: "success", message: "Tu reseña quedó actualizada." };
}

export async function reportReviewAction(
  _state: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: reviewErrorMessage("unauthorized") };
  }

  const parsed = reportReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
    clientId: formData.get("clientId"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const limit = await checkRateLimit("report", user.id);
  if (!limit.success) {
    return { status: "error", message: reviewErrorMessage("rate_limited") };
  }

  const result = await reportReview(supabase, parsed.data);
  if (!result.ok) {
    return { status: "error", message: reviewErrorMessage(result.code) };
  }

  return {
    status: "success",
    message: result.duplicate
      ? reviewErrorMessage("already_reported")
      : "Reporte enviado. Gracias por avisar.",
  };
}
