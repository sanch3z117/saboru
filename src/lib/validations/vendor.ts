import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(3, "El nombre debe tener al menos 3 caracteres")
  .max(60, "El nombre no puede pasar de 60 caracteres");

const descriptionSchema = z
  .string()
  .trim()
  .max(600, "La descripción no puede pasar de 600 caracteres");

const shortTextSchema = z
  .string()
  .trim()
  .max(120, "El texto no puede pasar de 120 caracteres");

const timeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Usa una hora válida en formato HH:MM (24 h)",
  );

export const scheduleRangeSchema = z
  .tuple([timeSchema, timeSchema])
  .refine(
    ([open, close]) => open !== close,
    "La apertura y el cierre no pueden ser iguales",
  );

const dayRangesSchema = z
  .array(scheduleRangeSchema)
  .max(2, "Cada día admite máximo dos franjas");

export const weeklyScheduleSchema = z.object({
  mon: dayRangesSchema,
  tue: dayRangesSchema,
  wed: dayRangesSchema,
  thu: dayRangesSchema,
  fri: dayRangesSchema,
  sat: dayRangesSchema,
  sun: dayRangesSchema,
});

function coordinateSchema(min: number, max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `Escribe la ${label}`)
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value), `La ${label} debe ser un número`)
    .refine(
      (value) => value >= min && value <= max,
      `La ${label} debe estar entre ${min} y ${max}`,
    );
}

export const locationSchema = z.object({
  lat: coordinateSchema(-90, 90, "latitud"),
  lng: coordinateSchema(-180, 180, "longitud"),
});

export const establishmentSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  address: shortTextSchema,
  category: z
    .string()
    .trim()
    .max(40, "La categoría no puede pasar de 40 caracteres"),
});

export const productSchema = z.object({
  productId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
  name: z
    .string()
    .trim()
    .min(2, "El producto necesita un nombre")
    .max(80, "El nombre no puede pasar de 80 caracteres"),
  description: z
    .string()
    .trim()
    .max(400, "La descripción no puede pasar de 400 caracteres"),
  price_cop: z.coerce
    .number()
    .int("El precio va en pesos enteros")
    .min(500, "El precio mínimo es $ 500")
    .max(200000, "El precio máximo es $ 200.000"),
  category: z
    .string()
    .trim()
    .max(40, "La categoría no puede pasar de 40 caracteres"),
  available: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .transform((value) => value === "on" || value === "true"),
  allergens: z
    .string()
    .trim()
    .max(200, "Los alérgenos no pueden pasar de 200 caracteres")
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 10),
    ),
});

export const photoSchema = z.object({
  file: z.custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Selecciona una imagen",
  ),
});

export type EstablishmentInput = z.infer<typeof establishmentSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type WeeklyScheduleInput = z.infer<typeof weeklyScheduleSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
