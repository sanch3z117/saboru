import type { Database } from "@/types/database";

export type OwnReview = Pick<
  Database["public"]["Tables"]["reviews"]["Row"],
  | "id"
  | "rating_sabor"
  | "rating_cantidad"
  | "rating_precio"
  | "rating_presentacion"
  | "rating_calidad_precio"
  | "comment"
  | "created_at"
>;
