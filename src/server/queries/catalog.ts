import "server-only";

import { createHash } from "node:crypto";

import type { WeeklySchedule } from "@/lib/catalog/schedule";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  BlockRow,
  CatalogSnapshot,
  ProductRow,
  ProductStatsRow,
  PublicEstablishment,
  PublicReviewRow,
} from "@/types/catalog";
import type { Database } from "@/types/database";

export type {
  BlockRow,
  ProductRow,
  ProductStatsRow,
  PublicEstablishment,
  PublicReviewRow,
};

type SearchRpcArgs = Database["public"]["Functions"]["search_products"]["Args"];

function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function hashSnapshot(payload: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
}

export async function getBlocks(): Promise<BlockRow[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("campus_blocks")
    .select("id, name")
    .order("name");

  return unwrap(result) ?? [];
}

/** Bloque por defecto: "Bloque Central" y, si no existe, el primero por nombre. */
export async function getDefaultBlock(): Promise<BlockRow | null> {
  const supabase = await createClient();
  const named = await supabase
    .from("campus_blocks")
    .select("id, name")
    .eq("name", "Bloque Central")
    .maybeSingle();

  if (named.data) return named.data;

  const fallback = await supabase
    .from("campus_blocks")
    .select("id, name")
    .order("name")
    .limit(1)
    .maybeSingle();

  return fallback.data ?? null;
}

export async function getCategories(): Promise<string[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("products")
    .select("category")
    .eq("available", true);

  const rows = unwrap(result) ?? [];
  return [...new Set(rows.map((row) => row.category).filter(Boolean))].sort();
}

export async function searchProducts(params: {
  budget: number | null;
  blockId: string;
  radiusM: number;
  category: string | null;
}): Promise<CatalogSearchItem[]> {
  const supabase = await createClient();

  // Los tipos generados no reflejan null en argumentos, pero PostgREST lo acepta.
  const args = {
    p_budget: params.budget,
    p_block_id: params.blockId,
    p_radius_m: params.radiusM,
    p_category: params.category,
  } as unknown as SearchRpcArgs;

  const result = await supabase.rpc("search_products", args);
  const rows = unwrap(result) ?? [];

  return rows.map((row) => ({
    id: row.id,
    establishment_id: row.establishment_id,
    name: row.name,
    description: row.description,
    price_cop: row.price_cop,
    category: row.category,
    photo_url: row.photo_url,
    available: row.available,
    allergens: row.allergens,
    establishment_name: row.establishment_name,
    establishment_slug: row.establishment_slug,
    distance_m: row.distance_m,
    establishment_schedule:
      row.establishment_schedule as unknown as WeeklySchedule,
  }));
}

export async function getFeaturedEstablishments(limit = 6) {
  const supabase = await createClient();
  const result = await supabase
    .from("public_establishments")
    .select("id, name, slug, description, category, plan, photos")
    .in("plan", ["featured", "pro"])
    .order("name")
    .limit(limit);

  return unwrap(result) ?? [];
}

export async function getEstablishmentBySlug(slug: string) {
  const supabase = await createClient();
  const establishment = await supabase
    .from("public_establishments")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!establishment.data) return null;

  const productsResult = await supabase
    .from("products")
    .select(
      "id, establishment_id, name, description, price_cop, category, photo_url, available, allergens",
    )
    .eq("establishment_id", establishment.data.id)
    .order("name");
  const products = unwrap(productsResult) ?? [];

  const productIds = products.map((product) => product.id);
  const statsResult =
    productIds.length > 0
      ? await supabase
          .from("product_stats")
          .select("*")
          .in("product_id", productIds)
      : { data: [] as ProductStatsRow[], error: null };

  const reviewsResult = await supabase
    .from("public_reviews")
    .select("*")
    .eq("establishment_id", establishment.data.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    establishment: establishment.data,
    products,
    stats: unwrap(statsResult) ?? [],
    reviews: unwrap(reviewsResult) ?? [],
  };
}

export async function getProductById(id: string) {
  const supabase = await createClient();
  const productResult = await supabase
    .from("products")
    .select(
      "id, establishment_id, name, description, price_cop, category, photo_url, available, allergens",
    )
    .eq("id", id)
    .maybeSingle();

  if (!productResult.data) return null;
  const product = productResult.data;

  const establishmentResult = await supabase
    .from("public_establishments")
    .select("id, name, slug, category")
    .eq("id", product.establishment_id)
    .maybeSingle();

  const statsResult = await supabase
    .from("product_stats")
    .select("*")
    .eq("product_id", id)
    .maybeSingle();

  const reviewsResult = await supabase
    .from("public_reviews")
    .select("*")
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    product,
    establishment: establishmentResult.data,
    stats: statsResult.data,
    reviews: unwrap(reviewsResult) ?? [],
  };
}

export async function getCatalogSnapshot(): Promise<CatalogSnapshot> {
  const supabase = createPublicClient();

  const blocksResult = await supabase
    .from("public_blocks")
    .select("id, name, latitude, longitude")
    .order("name");
  const establishmentsResult = await supabase
    .from("public_establishments")
    .select("*")
    .order("name");
  const productsResult = await supabase
    .from("products")
    .select(
      "id, establishment_id, name, description, price_cop, category, photo_url, available, allergens",
    )
    .eq("available", true)
    .order("name")
    .order("id");
  const statsResult = await supabase
    .from("product_stats")
    .select("*")
    .order("product_id");
  const reviewsResult = await supabase
    .from("public_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id")
    .limit(200);

  const payload = {
    blocks: unwrap(blocksResult) ?? [],
    establishments: unwrap(establishmentsResult) ?? [],
    products: unwrap(productsResult) ?? [],
    product_stats: unwrap(statsResult) ?? [],
    reviews: unwrap(reviewsResult) ?? [],
  };

  return {
    version: hashSnapshot(payload),
    generated_at: new Date().toISOString(),
    ...payload,
  };
}
