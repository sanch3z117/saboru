import { describe, expect, it } from "vitest";

import { isOpenAt, type WeeklySchedule } from "@/lib/catalog/schedule";
import {
  filterCatalog,
  paginate,
  searchCatalog,
  type CatalogFilters,
  type CatalogSearchItem,
} from "@/lib/catalog/search";

function item(overrides: Partial<CatalogSearchItem> = {}): CatalogSearchItem {
  return {
    id: "p1",
    establishment_id: "e1",
    name: "Producto",
    description: "",
    price_cop: 5000,
    category: "fritos",
    photo_url: null,
    available: true,
    allergens: [],
    establishment_name: "Local",
    establishment_slug: "local",
    distance_m: 100,
    establishment_schedule: {},
    ...overrides,
  };
}

const weekdaySchedule: WeeklySchedule = {
  mon: [["08:00", "17:00"]],
};

const baseFilters: CatalogFilters = {
  budget: null,
  category: null,
  maxDistanceM: null,
  openNow: false,
};

describe("isOpenAt", () => {
  it("abre y cierra en la zona de Bogotá", () => {
    const schedule: WeeklySchedule = { mon: [["08:00", "17:00"]] };

    expect(
      isOpenAt(schedule, new Date("2026-11-02T15:00:00Z"), "America/Bogota"),
    ).toBe(true);
    expect(
      isOpenAt(schedule, new Date("2026-11-02T23:00:00Z"), "America/Bogota"),
    ).toBe(false);
  });

  it("maneja horarios que cruzan medianoche", () => {
    const schedule: WeeklySchedule = { fri: [["18:00", "02:00"]] };

    expect(
      isOpenAt(schedule, new Date("2026-11-07T05:00:00Z"), "America/Bogota"),
    ).toBe(true);
    expect(
      isOpenAt(schedule, new Date("2026-11-07T07:00:00Z"), "America/Bogota"),
    ).toBe(false);
  });

  it("devuelve false sin horario", () => {
    expect(isOpenAt(null, new Date("2026-11-02T15:00:00Z"))).toBe(false);
  });
});

describe("searchCatalog", () => {
  it("filtra por rango inclusivo y categorías múltiples", () => {
    const items = [
      item({ id: "inferior", price_cop: 4999, category: "fritos" }),
      item({ id: "incluido", price_cop: 5000, category: "fritos" }),
      item({ id: "otra-categoria", price_cop: 5500, category: "bebidas" }),
      item({ id: "superior", price_cop: 6001, category: "bebidas" }),
    ];

    expect(
      searchCatalog(items, {
        minBudget: 5000,
        budget: 6000,
        category: ["fritos", "bebidas"],
        maxDistanceM: null,
        openNow: false,
      }).map((row) => row.id),
    ).toEqual(["incluido", "otra-categoria"]);
  });

  it("filtra por presupuesto, categoría y distancia", () => {
    const items = [
      item({ id: "barato", price_cop: 4000, category: "fritos" }),
      item({ id: "caro", price_cop: 12000, category: "fritos" }),
      item({ id: "lejos", distance_m: 3000 }),
      item({ id: "otra", category: "bebidas" }),
    ];

    const result = searchCatalog(items, {
      budget: 5000,
      category: "fritos",
      maxDistanceM: 1000,
      openNow: false,
    });

    expect(result.map((row) => row.id)).toEqual(["barato"]);
  });

  it("filtra por abierto ahora con un reloj fijo", () => {
    const items = [
      item({ id: "abierto", establishment_schedule: weekdaySchedule }),
      item({
        id: "cerrado",
        establishment_schedule: { mon: [["18:00", "22:00"]] },
      }),
    ];

    const result = filterCatalog(items, {
      budget: null,
      category: null,
      maxDistanceM: null,
      openNow: true,
      now: new Date("2026-11-02T15:00:00Z"),
    });

    expect(result.map((row) => row.id)).toEqual(["abierto"]);
  });

  it("ordena por distancia y luego por precio", () => {
    const items = [
      item({ id: "caro-cerca", distance_m: 100, price_cop: 9000 }),
      item({ id: "barato-cerca", distance_m: 100, price_cop: 5000 }),
      item({ id: "lejos", distance_m: 500, price_cop: 1000 }),
    ];

    expect(searchCatalog(items, baseFilters).map((row) => row.id)).toEqual([
      "barato-cerca",
      "caro-cerca",
      "lejos",
    ]);
  });

  it("busca texto en producto, descripción, local y categoría sin acentos", () => {
    const items = [
      item({
        id: "arepa",
        name: "Arepa de queso",
        description: "Recién hecha",
        establishment_name: "Arepas del Bloque",
        category: "fritos",
      }),
      item({
        id: "cafe",
        name: "Café americano",
        description: "Bebida caliente",
        establishment_name: "Café Biblioteca",
        establishment_description: "Para estudiar",
        category: "bebidas",
      }),
      item({
        id: "almuerzo",
        name: "Almuerzo del día",
        description: "Sopa y seco",
        establishment_name: "Comedor",
        establishment_description: "Cocina de la abuela",
        category: "almuerzos",
      }),
    ];

    expect(
      searchCatalog(items, { ...baseFilters, q: "arepa" }).map((row) => row.id),
    ).toEqual(["arepa"]);
    expect(
      searchCatalog(items, { ...baseFilters, q: "cafe" }).map((row) => row.id),
    ).toEqual(["cafe"]);
    expect(
      searchCatalog(items, { ...baseFilters, q: "abuela" }).map(
        (row) => row.id,
      ),
    ).toEqual(["almuerzo"]);
    expect(
      searchCatalog(items, { ...baseFilters, q: "bebidas" }).map(
        (row) => row.id,
      ),
    ).toEqual(["cafe"]);
    expect(
      searchCatalog(items, { ...baseFilters, q: "sopa seco" }).map(
        (row) => row.id,
      ),
    ).toEqual(["almuerzo"]);
  });

  it("recalcula la distancia desde el origen si el ítem trae coordenadas", () => {
    const origin = { latitude: 5.552, longitude: -73.3567 };
    const items = [
      item({
        id: "cerca",
        distance_m: 9999,
        establishment_latitude: 5.552,
        establishment_longitude: -73.3567,
      }),
      item({
        id: "lejos",
        distance_m: 1,
        establishment_latitude: 5.56,
        establishment_longitude: -73.3567,
      }),
    ];

    expect(
      searchCatalog(items, {
        ...baseFilters,
        maxDistanceM: 100,
        origin,
      }).map((row) => row.id),
    ).toEqual(["cerca"]);
  });

  it("ordena por precio y por rating del local, con nulos al final", () => {
    const items = [
      item({ id: "medio", price_cop: 8000, establishment_rating: 3.8 }),
      item({ id: "caro", price_cop: 12000, establishment_rating: null }),
      item({ id: "barato", price_cop: 5000, establishment_rating: 4.6 }),
    ];

    expect(
      searchCatalog(items, { ...baseFilters, order: "price" }).map(
        (row) => row.id,
      ),
    ).toEqual(["barato", "medio", "caro"]);
    expect(
      searchCatalog(items, { ...baseFilters, order: "rating" }).map(
        (row) => row.id,
      ),
    ).toEqual(["barato", "medio", "caro"]);
  });
});

describe("paginate", () => {
  it("pagina y limita la página al rango válido", () => {
    const items = [1, 2, 3, 4, 5];

    expect(paginate(items, 1, 2)).toMatchObject({
      items: [1, 2],
      page: 1,
      total: 5,
      totalPages: 3,
    });
    expect(paginate(items, 2, 2).items).toEqual([3, 4]);
    expect(paginate(items, 99, 2)).toMatchObject({ page: 3, items: [5] });
    expect(paginate(items, -3, 2)).toMatchObject({ page: 1, items: [1, 2] });
  });
});
