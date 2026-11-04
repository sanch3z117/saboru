import "server-only";

import { createClient } from "@/lib/supabase/server";

export type FavoriteContext = {
  userId: string | null;
  canFavorite: boolean;
  saved: boolean | null;
};

/**
 * Estado inicial del favorito propio para una ficha. El estado del servidor
 * manda sobre IndexedDB cuando está disponible; el botón resuelve la prioridad.
 */
export async function getFavoriteContext({
  establishmentId,
  productId,
}: {
  establishmentId: string;
  productId: string | null;
}): Promise<FavoriteContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, canFavorite: false, saved: null };
  }

  const studentResult = await supabase.rpc("is_institutional_student");
  if (!studentResult.data) {
    return { userId: user.id, canFavorite: false, saved: null };
  }

  let query = supabase
    .from("favorites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("establishment_id", establishmentId);

  query =
    productId === null
      ? query.is("product_id", null)
      : query.eq("product_id", productId);

  const { count, error } = await query;

  return {
    userId: user.id,
    canFavorite: true,
    saved: error ? null : (count ?? 0) > 0,
  };
}
