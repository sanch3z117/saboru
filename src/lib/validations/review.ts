import { z } from "zod";

const ratingSchema = z.coerce
  .number()
  .int()
  .min(1, "Cada criterio debe estar entre 1 y 5")
  .max(5, "Cada criterio debe estar entre 1 y 5");

const commentSchema = z
  .string()
  .trim()
  .max(500, "El comentario no puede pasar de 500 caracteres")
  .transform((value) => (value.length > 0 ? value : null));

export const reviewRatingsSchema = z.object({
  rating_sabor: ratingSchema,
  rating_cantidad: ratingSchema,
  rating_precio: ratingSchema,
  rating_presentacion: ratingSchema,
  rating_calidad_precio: ratingSchema,
});

export const createReviewSchema = reviewRatingsSchema.extend({
  productId: z.uuid(),
  establishmentId: z.uuid(),
  clientId: z.uuid(),
  comment: commentSchema,
});

export const updateReviewSchema = reviewRatingsSchema.extend({
  reviewId: z.uuid(),
  comment: commentSchema,
});

export const reportReviewSchema = z.object({
  reviewId: z.uuid(),
  clientId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "Escribe el motivo del reporte")
    .max(300, "El motivo no puede pasar de 300 caracteres"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
