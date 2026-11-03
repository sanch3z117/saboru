import { describe, expect, it } from "vitest";

import { distanceMeters } from "@/lib/catalog/distance";
import { searchCatalog } from "@/lib/catalog/search";
import { snapshotToSearchItems } from "@/lib/offline/snapshot";
import type { CatalogSnapshot } from "@/types/catalog";

const BLOCK = { latitude: 5.552, longitude: -73.3567 };

type SnapshotInput = {
  establishments: Array<{
    id: string;
    name: string;
    slug: string;
    schedule: unknown;
    latitude: number;
    longitude: number;
  }>;
  products: Array<{
    id: string;
    establishment_id: string;
    name: string;
    price_cop: number;
    available: boolean;
    category: string;
  }>;
};

function snapshot(input: SnapshotInput) {
  return {
    establishments: input.establishments.map((item) => ({
      description: "",
      address: "",
      category: "almuerzo",
      photos: [],
      status: "active",
      plan: "basic",
      ...item,
    })),
    products: input.products.map((item) => ({
      description: "",
      photo_url: null,
      allergens: [],
      ...item,
    })),
  } as unknown as Pick<CatalogSnapshot, "establishments" | "products">;
}

describe("distancia offline (haversine)", () => {
  it("da cero en el mismo punto y una distancia razonable entre ciudades", () => {
    expect(distanceMeters(BLOCK, BLOCK)).toBe(0);

    const tunjaBogota = distanceMeters(BLOCK, {
      latitude: 4.711,
      longitude: -74.0721,
    });
    expect(tunjaBogota).toBeGreaterThan(120_000);
    expect(tunjaBogota).toBeLessThan(140_000);
  });
});

describe("snapshot a CatalogSearchItem", () => {
  it("mapea productos, establecimiento, horario y distancia", () => {
    const items = snapshotToSearchItems(
      snapshot({
        establishments: [
          {
            id: "e1",
            name: "Cerca",
            slug: "cerca",
            schedule: { mon: [["08:00", "17:00"]] },
            latitude: BLOCK.latitude,
            longitude: BLOCK.longitude,
          },
        ],
        products: [
          {
            id: "p1",
            establishment_id: "e1",
            name: "Almuerzo",
            price_cop: 9000,
            available: true,
            category: "almuerzo",
          },
        ],
      }),
      BLOCK,
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "p1",
      establishment_name: "Cerca",
      establishment_slug: "cerca",
      establishment_schedule: { mon: [["08:00", "17:00"]] },
    });
    expect(items[0]?.distance_m).toBeCloseTo(0, 5);
  });

  it("descarta productos agotados y productos sin establecimiento", () => {
    const items = snapshotToSearchItems(
      snapshot({
        establishments: [
          {
            id: "e1",
            name: "Local",
            slug: "local",
            schedule: {},
            latitude: BLOCK.latitude,
            longitude: BLOCK.longitude,
          },
        ],
        products: [
          {
            id: "agotado",
            establishment_id: "e1",
            name: "Agotado",
            price_cop: 8000,
            available: false,
            category: "almuerzo",
          },
          {
            id: "huerfano",
            establishment_id: "e2",
            name: "Huérfano",
            price_cop: 8000,
            available: true,
            category: "almuerzo",
          },
        ],
      }),
      BLOCK,
    );

    expect(items).toEqual([]);
  });

  it("ordena igual que el catálogo online por distancia y precio", () => {
    const items = snapshotToSearchItems(
      snapshot({
        establishments: [
          {
            id: "cerca",
            name: "Cerca",
            slug: "cerca",
            schedule: {},
            latitude: 5.552,
            longitude: -73.3567,
          },
          {
            id: "lejos",
            name: "Lejos",
            slug: "lejos",
            schedule: {},
            latitude: 5.56,
            longitude: -73.3567,
          },
        ],
        products: [
          {
            id: "lejos-barato",
            establishment_id: "lejos",
            name: "Lejos barato",
            price_cop: 7000,
            available: true,
            category: "almuerzo",
          },
          {
            id: "cerca-caro",
            establishment_id: "cerca",
            name: "Cerca caro",
            price_cop: 9000,
            available: true,
            category: "almuerzo",
          },
          {
            id: "cerca-barato",
            establishment_id: "cerca",
            name: "Cerca barato",
            price_cop: 8000,
            available: true,
            category: "almuerzo",
          },
        ],
      }),
      BLOCK,
    );

    const ordered = searchCatalog(items, {
      budget: 10000,
      category: "almuerzo",
      maxDistanceM: 5000,
      openNow: false,
    });

    expect(ordered.map((item) => item.id)).toEqual([
      "cerca-barato",
      "cerca-caro",
      "lejos-barato",
    ]);
  });
});
