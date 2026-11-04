import { describe, expect, it } from "vitest";

import type { ProductStatsRow } from "@/types/catalog";
import {
  aggregateEstablishmentRating,
  MIN_REVIEWS_FOR_RATING,
  productAverageRating,
} from "@/lib/catalog/rating";

function stat(overrides: Partial<ProductStatsRow> = {}): ProductStatsRow {
  return {
    product_id: "product-1",
    review_count: 5,
    avg_sabor: 5,
    avg_cantidad: 4,
    avg_precio: 4,
    avg_presentacion: 5,
    avg_calidad_precio: 4,
    ...overrides,
  };
}

describe("rating agregado de un local", () => {
  it("solo cuenta productos con el mínimo de reseñas", () => {
    expect(
      productAverageRating(stat({ review_count: MIN_REVIEWS_FOR_RATING - 1 })),
    ).toBeNull();
    expect(productAverageRating(stat())).toBe(4.4);
  });

  it("promedia los productos que califican y suma sus reseñas", () => {
    const result = aggregateEstablishmentRating(
      [
        stat({ product_id: "p1", review_count: 5 }),
        stat({
          product_id: "p2",
          review_count: 5,
          avg_sabor: 3,
          avg_cantidad: 3,
          avg_precio: 3,
          avg_presentacion: 3,
          avg_calidad_precio: 3,
        }),
        stat({ product_id: "p3", review_count: 4 }),
      ],
      new Set(["p1", "p2", "p3"]),
    );

    expect(result.rating).toBeCloseTo(3.7, 2);
    expect(result.reviewCount).toBe(10);
  });

  it("devuelve null si ningún producto alcanza el mínimo", () => {
    const result = aggregateEstablishmentRating(
      [stat({ product_id: "p1", review_count: 4 })],
      new Set(["p1"]),
    );

    expect(result).toEqual({ rating: null, reviewCount: 0 });
  });
});
