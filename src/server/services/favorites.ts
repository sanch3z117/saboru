import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapReviewDbError, type ReviewErrorCode } from "@/lib/reviews/errors";
import type { FavoritePayload } from "@/lib/validations/sync";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type FavoriteResult =
  { ok: true; duplicate?: boolean } | { ok: false; code: ReviewErrorCode };

async function currentUserId(client: Client) {
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id ?? null;
}

/**
 * Alta/baja idempotente. Un alta duplicada (23505) se trata como `duplicate`;
 * una baja sin filas también es éxito.
 */
export async function toggleFavorite(
  client: Client,
  input: FavoritePayload,
): Promise<FavoriteResult> {
  const userId = await currentUserId(client);
  if (!userId) {
    return { ok: false, code: "unauthorized" };
  }

  if (input.action === "add") {
    const { error } = await client.from("favorites").insert({
      establishment_id: input.establishmentId,
      product_id: input.productId,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: true, duplicate: true };
      }
      return { ok: false, code: mapReviewDbError(error) };
    }

    return { ok: true };
  }

  const base = client
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("establishment_id", input.establishmentId);

  const { error } =
    input.productId === null
      ? await base.is("product_id", null)
      : await base.eq("product_id", input.productId);

  if (error) {
    return { ok: false, code: mapReviewDbError(error) };
  }

  return { ok: true };
}
