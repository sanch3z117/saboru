import { z } from "zod";

import { createReviewSchema, reportReviewSchema } from "./review";

export const favoritePayloadSchema = z.object({
  action: z.enum(["add", "remove"]),
  establishmentId: z.uuid(),
  productId: z.uuid().nullable(),
});

export const syncOperationSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("review"),
      clientId: z.uuid(),
      payload: createReviewSchema,
    })
    .refine((operation) => operation.payload.clientId === operation.clientId, {
      message: "El clientId de la reseña no coincide",
      path: ["clientId"],
    }),
  z
    .object({
      type: z.literal("report"),
      clientId: z.uuid(),
      payload: reportReviewSchema,
    })
    .refine((operation) => operation.payload.clientId === operation.clientId, {
      message: "El clientId del reporte no coincide",
      path: ["clientId"],
    }),
  z.object({
    type: z.literal("favorite"),
    clientId: z.uuid(),
    payload: favoritePayloadSchema,
  }),
]);

export const syncBodySchema = z.object({
  operations: z
    .array(syncOperationSchema)
    .min(1, "El lote está vacío")
    .max(20, "El lote no puede pasar de 20 operaciones"),
});

export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type SyncRequestBody = z.infer<typeof syncBodySchema>;
export type FavoritePayload = z.infer<typeof favoritePayloadSchema>;
