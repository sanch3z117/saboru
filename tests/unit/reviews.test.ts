import { describe, expect, it } from "vitest";

import { mapReviewDbError, reviewErrorMessage } from "@/lib/reviews/errors";
import { reviewAverage, statsAverage } from "@/lib/reviews/stats";
import { isWithinReviewWindow } from "@/lib/reviews/window";
import {
  createReviewSchema,
  reportReviewSchema,
} from "@/lib/validations/review";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-03T12:00:00Z");

describe("ventana de 30 días", () => {
  it("permite editar antes de 30 días y bloquea desde el día 30", () => {
    expect(
      isWithinReviewWindow(new Date(NOW.getTime() - 29 * DAY_MS), NOW),
    ).toBe(true);
    expect(
      isWithinReviewWindow(new Date(NOW.getTime() - 30 * DAY_MS), NOW),
    ).toBe(false);
    expect(
      isWithinReviewWindow(new Date(NOW.getTime() - 31 * DAY_MS), NOW),
    ).toBe(false);
  });
});

describe("promedios", () => {
  it("promedia los cinco criterios de una reseña", () => {
    expect(
      reviewAverage({
        rating_sabor: 5,
        rating_cantidad: 4,
        rating_precio: 3,
        rating_presentacion: 2,
        rating_calidad_precio: 1,
      }),
    ).toBe(3);
  });

  it("oculta el promedio público con menos de 5 reseñas", () => {
    const base = {
      avg_sabor: "4",
      avg_cantidad: "4",
      avg_precio: "4",
      avg_presentacion: "4",
      avg_calidad_precio: "4",
    };

    expect(statsAverage({ ...base, review_count: 4 })).toBeNull();
    expect(statsAverage({ ...base, review_count: 5 })).toBe(4);
  });
});

describe("errores de reseñas", () => {
  it("mapea los errores de la base", () => {
    expect(
      mapReviewDbError({ code: "P0001", message: "review_cooldown" }),
    ).toBe("review_cooldown");
    expect(
      mapReviewDbError({ code: "P0001", message: "product_unavailable" }),
    ).toBe("product_unavailable");
    expect(mapReviewDbError({ code: "23505" })).toBe("duplicate");
    expect(mapReviewDbError({ code: "42501" })).toBe("forbidden");
    expect(mapReviewDbError({ code: "P0002" })).toBe("not_found");
    expect(mapReviewDbError({ code: "XX000", message: "otra" })).toBe(
      "invalid",
    );
  });

  it("devuelve mensajes claros", () => {
    expect(reviewErrorMessage("review_cooldown")).toMatch(/30 días/);
    expect(reviewErrorMessage("product_unavailable")).toMatch(
      /no está disponible/,
    );
    expect(reviewErrorMessage("own_review")).toMatch(/propia/);
    expect(reviewErrorMessage("rate_limited")).toMatch(/Demasiadas/);
  });
});

describe("esquemas de reseña", () => {
  const validReview = {
    productId: "20000000-0000-4000-8000-000000000001",
    establishmentId: "10000000-0000-4000-8000-000000000001",
    clientId: "30000000-0000-4000-8000-000000000001",
    rating_sabor: "5",
    rating_cantidad: "4",
    rating_precio: "3",
    rating_presentacion: "2",
    rating_calidad_precio: "1",
    comment: "  Buen almuerzo  ",
  };

  it("acepta valores de formulario y normaliza el comentario", () => {
    const parsed = createReviewSchema.safeParse(validReview);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.rating_sabor).toBe(5);
    expect(parsed.data?.comment).toBe("Buen almuerzo");
  });

  it("convierte comentario vacío en null", () => {
    const parsed = createReviewSchema.safeParse({
      ...validReview,
      comment: "   ",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.comment).toBeNull();
  });

  it("rechaza ratings fuera de 1–5 y comentarios de más de 500", () => {
    expect(
      createReviewSchema.safeParse({ ...validReview, rating_sabor: "6" })
        .success,
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({
        ...validReview,
        comment: "a".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("valida el motivo del reporte entre 1 y 300", () => {
    const base = {
      reviewId: "40000000-0000-4000-8000-000000000001",
      clientId: "30000000-0000-4000-8000-000000000001",
    };
    expect(
      reportReviewSchema.safeParse({ ...base, reason: "  " }).success,
    ).toBe(false);
    expect(
      reportReviewSchema.safeParse({ ...base, reason: "a".repeat(301) })
        .success,
    ).toBe(false);
    expect(
      reportReviewSchema.safeParse({ ...base, reason: "Spam" }).success,
    ).toBe(true);
  });
});
