import { describe, expect, it } from "vitest";

import {
  establishmentSchema,
  locationSchema,
  productSchema,
  weeklyScheduleSchema,
} from "@/lib/validations/vendor";
import {
  PHOTO_MAX_BYTES,
  isOwnPhotoPath,
  photoPath,
  validatePhoto,
} from "@/lib/vendor/photos";
import {
  formatCoordinate,
  parsePointHex,
  scheduleFromFormData,
} from "@/lib/vendor/schedule";
import { formatSchedule } from "@/lib/catalog/schedule";

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

const emptyWeek = {
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

describe("horario semanal", () => {
  it("arma el objeto desde FormData con dos franjas", () => {
    const formData = new FormData();
    formData.set("mon-1-start", "08:00");
    formData.set("mon-1-end", "12:00");
    formData.set("mon-2-start", "14:00");
    formData.set("mon-2-end", "18:00");
    formData.set("fri-1-start", "18:00");
    formData.set("fri-1-end", "02:00");

    const parsed = scheduleFromFormData(formData);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.mon).toEqual([
      ["08:00", "12:00"],
      ["14:00", "18:00"],
    ]);
    expect(parsed.data.fri).toEqual([["18:00", "02:00"]]);
    expect(parsed.data.sat).toEqual([]);
  });

  it("falla si una franja queda a medias", () => {
    const formData = new FormData();
    formData.set("tue-1-start", "08:00");

    const parsed = scheduleFromFormData(formData);
    expect(parsed.ok).toBe(false);
  });

  it("valida el formato de hora y que apertura y cierre difieran", () => {
    const valid = weeklyScheduleSchema.safeParse({
      ...emptyWeek,
      mon: [["08:00", "17:00"]],
    });
    expect(valid.success).toBe(true);

    expect(
      weeklyScheduleSchema.safeParse({
        ...emptyWeek,
        mon: [["8:00", "17:00"]],
      }).success,
    ).toBe(false);

    expect(
      weeklyScheduleSchema.safeParse({
        ...emptyWeek,
        mon: [["08:00", "08:00"]],
      }).success,
    ).toBe(false);
  });

  it("rechaza más de dos franjas por día", () => {
    expect(
      weeklyScheduleSchema.safeParse({
        ...emptyWeek,
        mon: [
          ["08:00", "10:00"],
          ["11:00", "13:00"],
          ["14:00", "16:00"],
        ],
      }).success,
    ).toBe(false);
  });

  it("formatea el horario para la ficha pública", () => {
    const formatted = formatSchedule({
      mon: [["08:00", "12:00"]],
      tue: [],
    });

    expect(formatted[0]).toEqual({
      key: "mon",
      label: "Lunes",
      ranges: ["08:00–12:00"],
    });
    expect(formatted[1]).toEqual({ key: "tue", label: "Martes", ranges: [] });
    expect(formatted).toHaveLength(7);
  });
});

describe("ubicación", () => {
  it("acepta coordenadas dentro del rango", () => {
    const parsed = locationSchema.safeParse({
      lat: "5.552",
      lng: "-73.3567",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.lat).toBeCloseTo(5.552, 4);
      expect(parsed.data.lng).toBeCloseTo(-73.3567, 4);
    }
  });

  it("rechaza vacío, texto y fuera de rango", () => {
    expect(locationSchema.safeParse({ lat: "", lng: "-73" }).success).toBe(
      false,
    );
    expect(
      locationSchema.safeParse({ lat: "norte", lng: "-73" }).success,
    ).toBe(false);
    expect(locationSchema.safeParse({ lat: "91", lng: "-73" }).success).toBe(
      false,
    );
    expect(locationSchema.safeParse({ lat: "5", lng: "-181" }).success).toBe(
      false,
    );
  });

  it("lee el EWKB hexadecimal que devuelve PostGIS", () => {
    const point = parsePointHex(
      "0101000020E6100000ED9E3C2CD45652C06891ED7C3F351640",
    );

    expect(point).not.toBeNull();
    expect(point?.lat).toBeCloseTo(5.552, 3);
    expect(point?.lng).toBeCloseTo(-73.3567, 3);
    expect(formatCoordinate(point!.lat)).toBe("5.552000");
  });

  it("descarta formatos desconocidos", () => {
    expect(parsePointHex(null)).toBeNull();
    expect(parsePointHex("")).toBeNull();
    expect(parsePointHex("abc")).toBeNull();
    expect(parsePointHex("0101000020E6100000")).toBeNull();
  });
});
