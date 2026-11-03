import { describe, expect, it } from "vitest";

import {
  establishmentSchema,
  productSchema,
} from "@/lib/validations/vendor";
import {
  PHOTO_MAX_BYTES,
  isOwnPhotoPath,
  photoPath,
  validatePhoto,
} from "@/lib/vendor/photos";

const ESTABLISHMENT_ID = "11111111-1111-4111-8111-111111111111";
const FILE_ID = "22222222-2222-4222-8222-222222222222";

describe("validaciones del panel", () => {
  it("acepta una ficha válida", () => {
    const parsed = establishmentSchema.safeParse({
      name: "Café del Bloque",
      description: "Café y arepas",
      address: "Bloque Central",
      category: "café",
    });

    expect(parsed.success).toBe(true);
  });

  it("rechaza nombres cortos y textos largos", () => {
    expect(
      establishmentSchema.safeParse({
        name: "ab",
        description: "",
        address: "",
        category: "",
      }).success,
    ).toBe(false);

    expect(
      establishmentSchema.safeParse({
        name: "Local válido",
        description: "x".repeat(601),
        address: "",
        category: "",
      }).success,
    ).toBe(false);
  });

  it("convierte el precio a entero y separa alérgenos", () => {
    const parsed = productSchema.safeParse({
      productId: "",
      name: "Almuerzo",
      description: "",
      price_cop: "9000",
      category: "almuerzo",
      available: "on",
      allergens: "maní, lácteos ,, ",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.price_cop).toBe(9000);
    expect(parsed.data.available).toBe(true);
    expect(parsed.data.allergens).toEqual(["maní", "lácteos"]);
    expect(parsed.data.productId).toBeUndefined();
  });

  it("marca agotado cuando no viene la casilla", () => {
    const parsed = productSchema.safeParse({
      name: "Jugo",
      description: "",
      price_cop: "3000",
      category: "",
      available: null,
      allergens: "",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.available).toBe(false);
    }
  });

  it("rechaza precios inválidos", () => {
    for (const price of ["0", "499", "5000.5", "200001"]) {
      expect(
        productSchema.safeParse({
          name: "Producto",
          description: "",
          price_cop: price,
          category: "",
          available: "on",
          allergens: "",
        }).success,
      ).toBe(false);
    }
  });
});

describe("fotos del establecimiento", () => {
  it("solo acepta jpeg, png y webp hasta 5 MB", () => {
    expect(validatePhoto({ type: "image/jpeg", size: 1024 })).toEqual({
      ok: true,
      extension: "jpg",
    });
    expect(validatePhoto({ type: "image/png", size: 1024 }).ok).toBe(true);
    expect(validatePhoto({ type: "image/webp", size: 1024 }).ok).toBe(true);
    expect(validatePhoto({ type: "image/gif", size: 1024 }).ok).toBe(false);
    expect(validatePhoto({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(
      validatePhoto({ type: "image/png", size: PHOTO_MAX_BYTES + 1 }).ok,
    ).toBe(false);
  });

  it("construye rutas con uuid de establecimiento", () => {
    expect(photoPath(ESTABLISHMENT_ID, FILE_ID, "webp")).toBe(
      `${ESTABLISHMENT_ID}/${FILE_ID}.webp`,
    );

    expect(() => photoPath("otro-local", FILE_ID, "png")).toThrow();
    expect(() => photoPath(ESTABLISHMENT_ID, "archivo", "png")).toThrow();
  });

  it("reconoce solo las rutas del propio local", () => {
    expect(isOwnPhotoPath(`${ESTABLISHMENT_ID}/foto.jpg`, ESTABLISHMENT_ID)).toBe(
      true,
    );
    expect(isOwnPhotoPath(`${FILE_ID}/foto.jpg`, ESTABLISHMENT_ID)).toBe(false);
    expect(isOwnPhotoPath("foto.jpg", ESTABLISHMENT_ID)).toBe(false);
  });
});
