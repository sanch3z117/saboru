import { describe, expect, it } from "vitest";

import { syncBodySchema } from "@/lib/validations/sync";

const PRODUCT = "20000000-0000-4000-8000-000000000001";
const ESTABLISHMENT = "10000000-0000-4000-8000-000000000001";
const CLIENT_ID = "33333333-3333-4333-8333-333333333333";

function reviewOperation(clientId = CLIENT_ID) {
  return {
    type: "review",
    clientId,
    payload: {
      clientId,
      productId: PRODUCT,
      establishmentId: ESTABLISHMENT,
      comment: "Rica",
      rating_sabor: 5,
      rating_cantidad: 5,
      rating_precio: 5,
      rating_presentacion: 5,
      rating_calidad_precio: 5,
    },
  };
}

describe("contrato de /api/sync", () => {
  it("acepta reseña, reporte y favorito con su clientId", () => {
    const parsed = syncBodySchema.safeParse({
      operations: [
        reviewOperation(),
        {
          type: "report",
          clientId: "44444444-4444-4444-8444-444444444444",
          payload: {
            clientId: "44444444-4444-4444-8444-444444444444",
            reviewId: "55555555-5555-4555-8555-555555555555",
            reason: "Ofensiva",
          },
        },
        {
          type: "favorite",
          clientId: "66666666-6666-4666-8666-666666666666",
          payload: {
            action: "remove",
            establishmentId: ESTABLISHMENT,
            productId: null,
          },
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rechaza más de 20 operaciones", () => {
    const operations = Array.from({ length: 21 }, (_, index) =>
      reviewOperation(
        `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000000`,
      ),
    );

    expect(syncBodySchema.safeParse({ operations }).success).toBe(false);
  });

  it("exige que el clientId del payload coincida con el de la operación", () => {
    const operation = reviewOperation();
    operation.payload.clientId =
      "77777777-7777-4777-8777-777777777777";

    expect(syncBodySchema.safeParse({ operations: [operation] }).success).toBe(
      false,
    );
  });

  it("rechaza acciones de favorito desconocidas", () => {
    expect(
      syncBodySchema.safeParse({
        operations: [
          {
            type: "favorite",
            clientId: CLIENT_ID,
            payload: {
              action: "toggle",
              establishmentId: ESTABLISHMENT,
              productId: PRODUCT,
            },
          },
        ],
      }).success,
    ).toBe(false);
  });
});
