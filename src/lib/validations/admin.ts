import { z } from "zod";

import { emailSchema } from "@/lib/auth/validation";
import { locationSchema } from "@/lib/validations/vendor";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "El slug debe tener al menos 3 caracteres")
  .max(80, "El slug no puede pasar de 80 caracteres")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Usa minúsculas, números y guiones (sin espacios)",
  );

export const adminReviewStatusSchema = z.enum(["published", "hidden"]);
export const adminReportStatusSchema = z.enum(["reviewed", "dismissed"]);
export const adminEstablishmentStatusSchema = z.enum(["active", "suspended"]);
export const adminEstablishmentPlanSchema = z.enum([
  "basic",
  "featured",
  "pro",
]);

export const adminEstablishmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(60, "El nombre no puede pasar de 60 caracteres"),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(600, "La descripción no puede pasar de 600 caracteres"),
  address: z
    .string()
    .trim()
    .max(120, "La dirección no puede pasar de 120 caracteres"),
  category: z
    .string()
    .trim()
    .min(1, "Escribe una categoría")
    .max(40, "La categoría no puede pasar de 40 caracteres"),
  blockId: z.uuid("Selecciona un bloque"),
  lat: locationSchema.shape.lat,
  lng: locationSchema.shape.lng,
});

export const adminInviteSchema = z.object({
  email: emailSchema,
  establishmentId: z.uuid("Selecciona un local"),
});

export type AdminEstablishmentInput = z.infer<typeof adminEstablishmentSchema>;
export type AdminInviteInput = z.infer<typeof adminInviteSchema>;
