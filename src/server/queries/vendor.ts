import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { photoSrc } from "@/lib/photos";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type EstablishmentRow =
  Database["public"]["Tables"]["establishments"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export type ProductStatsRow =
  Database["public"]["Functions"]["vendor_product_stats"]["Returns"][number];
export type TopProductRow =
  Database["public"]["Functions"]["vendor_top_products"]["Returns"][number];
export type ViewsByHourRow =
  Database["public"]["Functions"]["vendor_views_by_hour"]["Returns"][number];
export type CampusComparisonRow = {
  local_avg: number | null;
  campus_avg: number | null;
  local_review_count: number;
};
export type RecentCommentRow =
  Database["public"]["Functions"]["vendor_recent_comments"]["Returns"][number];

export type VendorDashboard = {
  forbidden: boolean;
  stats: ProductStatsRow[];
  topProducts: TopProductRow[];
  viewsByHour: ViewsByHourRow[];
  comparison: CampusComparisonRow | null;
  comments: RecentCommentRow[];
};

const emptyDashboard: VendorDashboard = {
  forbidden: false,
  stats: [],
  topProducts: [],
  viewsByHour: [],
  comparison: null,
  comments: [],
};

export async function getOwnEstablishment(
  client: Client,
  userId: string,
): Promise<EstablishmentRow | null> {
  const { data, error } = await client
    .from("establishments")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function getVendorProducts(
  client: Client,
  establishmentId: string,
): Promise<ProductRow[]> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Estadísticas del local: solo RPC con agregados anónimos y mínimo de reseñas.
 * Ninguna consulta devuelve `user_id` ni datos del autor.
 */
export async function getVendorDashboard(
  establishmentId: string,
): Promise<VendorDashboard> {
  const supabase = await createClient();

  const [stats, topProducts, viewsByHour, comparison, comments] =
    await Promise.all([
      supabase.rpc("vendor_product_stats", {
        p_establishment_id: establishmentId,
      }),
      supabase.rpc("vendor_top_products", {
        p_establishment_id: establishmentId,
      }),
      supabase.rpc("vendor_views_by_hour", {
        p_establishment_id: establishmentId,
      }),
      supabase.rpc("vendor_campus_comparison", {
        p_establishment_id: establishmentId,
      }),
      supabase.rpc("vendor_recent_comments", {
        p_establishment_id: establishmentId,
      }),
    ]);

  const firstError =
    stats.error ??
    topProducts.error ??
    viewsByHour.error ??
    comparison.error ??
    comments.error;

  if (firstError) {
    if (firstError.code === "42501") {
      return { ...emptyDashboard, forbidden: true };
    }
    throw new Error(firstError.message);
  }

  return {
    forbidden: false,
    stats: stats.data ?? [],
    topProducts: topProducts.data ?? [],
    viewsByHour: viewsByHour.data ?? [],
    comparison: comparison.data?.[0] ?? null,
    comments: comments.data ?? [],
  };
}

export function photoPublicUrl(path: string) {
  return photoSrc(path, getSupabaseUrl()) ?? "";
}
