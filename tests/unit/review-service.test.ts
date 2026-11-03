import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createReview, reportReview } from "@/server/services/reviews";
import type { Database } from "@/types/database";

type DbError = { code?: string; message?: string } | null;
type SelectResult = { data: { id: string } | null; error: DbError };
type InsertResult = { data: { id: string } | null; error: DbError };

function makeClient(options: {
  userId?: string | null;
  selects?: SelectResult[];
  insert?: InsertResult;
}) {
  let index = 0;
  const insertSpy = vi.fn();

  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () =>
      options.selects?.[index++] ?? { data: null, error: null },
    update: () => builder,
    insert: (values: Record<string, unknown>) => {
      insertSpy(values);
      return {
        select: () => ({
          single: async () =>
            options.insert ?? { data: { id: "new-id" }, error: null },
        }),
      };
    },
  };

  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user:
            options.userId === null ? null : { id: options.userId ?? "user-1" },
        },
      }),
    },
    from: () => builder,
  } as unknown as SupabaseClient<Database>;

  return { client, insertSpy };
}

const input = {
  productId: "20000000-0000-4000-8000-000000000001",
  establishmentId: "10000000-0000-4000-8000-000000000001",
  clientId: "30000000-0000-4000-8000-000000000001",
  rating_sabor: 5,
  rating_cantidad: 4,
  rating_precio: 3,
  rating_presentacion: 2,
  rating_calidad_precio: 1,
  comment: "Buen almuerzo",
};

describe("createReview idempotente", () => {
  it("devuelve éxito si ya existe (user_id, client_id) sin insertar", async () => {
    const { client, insertSpy } = makeClient({
      selects: [{ data: { id: "review-1" }, error: null }],
    });

    const result = await createReview(client, input);

    expect(result).toEqual({
      ok: true,
      reviewId: "review-1",
      duplicate: true,
    });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("si el trigger lanza review_cooldown y la fila existe, es idempotente", async () => {
    const { client, insertSpy } = makeClient({
      selects: [
        { data: null, error: null },
        { data: { id: "review-2" }, error: null },
      ],
      insert: {
        data: null,
        error: { code: "P0001", message: "review_cooldown" },
      },
    });

    const result = await createReview(client, input);

    expect(result).toEqual({
      ok: true,
      reviewId: "review-2",
      duplicate: true,
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it("devuelve product_unavailable cuando el producto no está disponible", async () => {
    const { client } = makeClient({
      selects: [{ data: null, error: null }],
      insert: {
        data: null,
        error: { code: "P0001", message: "product_unavailable" },
      },
    });

    const result = await createReview(client, input);

    expect(result).toEqual({ ok: false, code: "product_unavailable" });
  });

  it("sin sesión no intenta insertar", async () => {
    const { client, insertSpy } = makeClient({ userId: null });

    const result = await createReview(client, input);

    expect(result).toEqual({ ok: false, code: "unauthorized" });
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe("reportReview", () => {
  const report = {
    reviewId: "40000000-0000-4000-8000-000000000001",
    clientId: "30000000-0000-4000-8000-000000000001",
    reason: "Contenido ofensivo",
  };

  it("rechaza reportar la propia reseña", async () => {
    const { client, insertSpy } = makeClient({
      selects: [{ data: { id: report.reviewId }, error: null }],
    });

    const result = await reportReview(client, report);

    expect(result).toEqual({ ok: false, code: "own_review" });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("trata el reintento con el mismo client_id como duplicado", async () => {
    const { client, insertSpy } = makeClient({
      selects: [
        { data: null, error: null },
        { data: { id: "report-1" }, error: null },
      ],
    });

    const result = await reportReview(client, report);

    expect(result).toEqual({
      ok: true,
      reportId: "report-1",
      duplicate: true,
    });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("inserta el reporte de una reseña ajena", async () => {
    const { client, insertSpy } = makeClient({
      selects: [
        { data: null, error: null },
        { data: null, error: null },
      ],
      insert: { data: { id: "report-2" }, error: null },
    });

    const result = await reportReview(client, report);

    expect(result).toEqual({ ok: true, reportId: "report-2" });
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });
});
