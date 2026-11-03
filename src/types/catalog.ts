import type { Database } from "@/types/database";

export type BlockRow = { id: string; name: string };

export type PublicEstablishment =
  Database["public"]["Views"]["public_establishments"]["Row"];

export type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "establishment_id"
  | "name"
  | "description"
  | "price_cop"
  | "category"
  | "photo_url"
  | "available"
  | "allergens"
>;

export type ProductStatsRow =
  Database["public"]["Views"]["product_stats"]["Row"];

export type PublicReviewRow =
  Database["public"]["Views"]["public_reviews"]["Row"];
