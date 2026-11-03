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

export const vendorEmailSchema = emailSchema;
