import { z } from "zod";

export const ALLOWED_STUDENT_DOMAIN = "uptc.edu.co";

export const emailSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(z.email("Escribe un correo válido"));

export const studentEmailSchema = emailSchema.refine(
  (value) => value.endsWith(`@${ALLOWED_STUDENT_DOMAIN}`),
  { message: "Usa tu correo institucional UPTC (@uptc.edu.co)" },
);

/**
 * Esquema del registro de estudiante. Solo el modo demo relaja el dominio;
 * el login, las invitaciones de vendedor y las reseñas no usan esta función.
 */
export function studentRegistrationEmailSchema(allowAnyEmail: boolean) {
  return allowAnyEmail ? emailSchema : studentEmailSchema;
}

export const vendorEmailSchema = emailSchema;
