import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapReviewDbError, type ReviewErrorCode } from "@/lib/reviews/errors";
import type {
  CreateReviewInput,
  ReportReviewInput,
  UpdateReviewInput,
} from "@/lib/validations/review";
import type { Database } from "@/types/database";

export type ReviewResult =
  | { ok: true; reviewId: string; duplicate?: boolean }
  | { ok: false; code: ReviewErrorCode };

export type ReportResult =
  | { ok: true; reportId: string; duplicate?: boolean }
  | { ok: false; code: ReviewErrorCode };

type Client = SupabaseClient<Database>;

async function currentUserId(client: Client) {
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id ?? null;
}

async function findOwnReviewByClientId(
  client: Client,
  userId: string,
  clientId: string,
) {
  const { data } = await client
    .from("reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();

  return data;
}

export async function createReview(
  client: Client,
  input: CreateReviewInput,
): Promise<ReviewResult> {
  const userId = await currentUserId(client);
  if (!userId) return { ok: false, code: "unauthorized" };

  // Idempotencia antes del INSERT: el trigger corre antes que el unique.
  const existing = await findOwnReviewByClientId(
    client,
    userId,
    input.clientId,
  );
  if (existing) {
    return { ok: true, reviewId: existing.id, duplicate: true };
  }

  const { data, error } = await client
    .from("reviews")
    .insert({
      client_id: input.clientId,
      user_id: userId,
      product_id: input.productId,
      establishment_id: input.establishmentId,
      rating_sabor: input.rating_sabor,
      rating_cantidad: input.rating_cantidad,
      rating_precio: input.rating_precio,
      rating_presentacion: input.rating_presentacion,
      rating_calidad_precio: input.rating_calidad_precio,
      comment: input.comment,
    })
    .select("id")
    .single();

  if (error) {
    const code = mapReviewDbError(error);

    if (code === "duplicate" || code === "review_cooldown") {
      const again = await findOwnReviewByClientId(
        client,
        userId,
        input.clientId,
      );
      if (again) {
        return { ok: true, reviewId: again.id, duplicate: true };
      }
    }

    return { ok: false, code };
  }

  return { ok: true, reviewId: data.id };
}

export async function updateReview(
  client: Client,
  input: UpdateReviewInput,
): Promise<ReviewResult> {
  const userId = await currentUserId(client);
  if (!userId) return { ok: false, code: "unauthorized" };

  const { data, error } = await client
    .from("reviews")
    .update({
      rating_sabor: input.rating_sabor,
      rating_cantidad: input.rating_cantidad,
      rating_precio: input.rating_precio,
      rating_presentacion: input.rating_presentacion,
      rating_calidad_precio: input.rating_calidad_precio,
      comment: input.comment,
    })
    .eq("id", input.reviewId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, code: mapReviewDbError(error) };
  }

  if (!data) {
    const { data: own } = await client
      .from("reviews")
      .select("id")
      .eq("id", input.reviewId)
      .maybeSingle();

    return { ok: false, code: own ? "window_expired" : "not_found" };
  }

  return { ok: true, reviewId: data.id };
}

export async function reportReview(
  client: Client,
  input: ReportReviewInput,
): Promise<ReportResult> {
  const userId = await currentUserId(client);
  if (!userId) return { ok: false, code: "unauthorized" };

  // La RLS solo muestra las reseñas propias: si aparece, es del usuario.
  const { data: own } = await client
    .from("reviews")
    .select("id")
    .eq("id", input.reviewId)
    .maybeSingle();

  if (own) {
    return { ok: false, code: "own_review" };
  }

  const { data: existing } = await client
    .from("review_reports")
    .select("id")
    .eq("reporter_id", userId)
    .eq("client_id", input.clientId)
    .maybeSingle();

  if (existing) {
    return { ok: true, reportId: existing.id, duplicate: true };
  }

  const { data, error } = await client
    .from("review_reports")
    .insert({
      client_id: input.clientId,
      review_id: input.reviewId,
      reason: input.reason,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await client
        .from("review_reports")
        .select("id")
        .eq("reporter_id", userId)
        .eq("client_id", input.clientId)
        .maybeSingle();

      if (again) return { ok: true, reportId: again.id, duplicate: true };

      const { data: sameReview } = await client
        .from("review_reports")
        .select("id")
        .eq("reporter_id", userId)
        .eq("review_id", input.reviewId)
        .maybeSingle();

      if (sameReview) {
        return { ok: true, reportId: sameReview.id, duplicate: true };
      }
    }

    return { ok: false, code: mapReviewDbError(error) };
  }

  return { ok: true, reportId: data.id };
}
