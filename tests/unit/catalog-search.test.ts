import { describe, expect, it } from "vitest";

import { isOpenAt, type WeeklySchedule } from "@/lib/catalog/schedule";
import {
  filterCatalog,
  paginate,
  searchCatalog,
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

    expect(
      searchCatalog(items, {
        budget: null,
        category: null,
        maxDistanceM: null,
        openNow: false,
      }).map((row) => row.id),
    ).toEqual(["barato-cerca", "caro-cerca", "lejos"]);
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
