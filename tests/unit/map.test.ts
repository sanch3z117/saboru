import { describe, expect, it } from "vitest";

import type { Coordinates } from "@/lib/catalog/distance";
import {
  CAMPUS_BOUNDS_PADDING,
  CAMPUS_CENTER,
  FALLBACK_CAMPUS_BOUNDS,
  mapStyleFor,
} from "@/lib/map/config";
import { campusBoundsFromBlocks, placesFromSnapshot } from "@/lib/map/places";
import type {
  CatalogSnapshot,
  ProductRow,
  ProductStatsRow,
  PublicEstablishment,
} from "@/types/catalog";

function establishment(
  overrides: Partial<PublicEstablishment> = {},
): PublicEstablishment {
  return {
    id: "establishment-1",
    slug: "local-1",
    name: "Local uno",
    description: "Descripción",
    address: "Campus",
    category: "almuerzos",
    plan: "basic",
    photos: [],
    schedule: {},
    status: "active",
    latitude: 5.552,
    longitude: -73.3567,
    ...overrides,
  };
}

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "product-1",
    establishment_id: "establishment-1",
    name: "Producto",
    description: "Descripción",
    price_cop: 5000,
    category: "almuerzos",
    photo_url: null,
    available: true,
    allergens: [],
    ...overrides,
  };
}

function stats(overrides: Partial<ProductStatsRow> = {}): ProductStatsRow {
  return {
    product_id: "product-1",
    review_count: 1,
    avg_sabor: 5,
    avg_cantidad: 4,
    avg_precio: 4,
    avg_presentacion: 5,
    avg_calidad_precio: 4,
    ...overrides,
  };
}

function snapshot(overrides: Partial<CatalogSnapshot> = {}): CatalogSnapshot {
  return {
    version: "test",
    generated_at: "2026-11-03T00:00:00.000Z",
    blocks: [],
    establishments: [],
    products: [],
    product_stats: [],
    reviews: [],
    ...overrides,
  };
}

describe("mapStyleFor", () => {
  it("usa MapTiler con la clave pública y codifica la clave", () => {
    const config = mapStyleFor("clave con espacios");

    expect(config.provider).toBe("maptiler");
    expect(config.style).toContain("api.maptiler.com/maps/streets-v2");
    expect(config.style).toContain("clave%20con%20espacios");
    expect(config.attribution).toContain("MapTiler");
  });

  it("cae a OSM con atribución si no hay clave", () => {
    for (const key of [undefined, null, "", "   "]) {
      const config = mapStyleFor(key);
      expect(config.provider).toBe("osm");
      expect(config.attribution).toContain("OpenStreetMap");
      expect(config.style).toMatchObject({
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tileSize: 256,
          },
        },
      });
    }
  });
});

describe("campusBoundsFromBlocks", () => {
  it("calcula los bounds de los 6 bloques con padding", () => {
    const blocks = [
      { latitude: 5.552, longitude: -73.3567 },
      { latitude: 5.5526, longitude: -73.3561 },
      { latitude: 5.5516, longitude: -73.3572 },
      { latitude: 5.5528, longitude: -73.3569 },
      { latitude: 5.5512, longitude: -73.3563 },
      { latitude: 5.5522, longitude: -73.3559 },
    ];

    const bounds = campusBoundsFromBlocks(blocks);

    expect(bounds[0][0]).toBeCloseTo(-73.3572 - CAMPUS_BOUNDS_PADDING);
    expect(bounds[0][1]).toBeCloseTo(5.5512 - CAMPUS_BOUNDS_PADDING);
    expect(bounds[1][0]).toBeCloseTo(-73.3559 + CAMPUS_BOUNDS_PADDING);
    expect(bounds[1][1]).toBeCloseTo(5.5528 + CAMPUS_BOUNDS_PADDING);
  });

  it("usa el rectángulo de respaldo si no hay bloques válidos", () => {
    expect(
      campusBoundsFromBlocks([
        { latitude: null, longitude: -73.35 },
        { latitude: 91, longitude: -73.35 },
      ]),
    ).toEqual(FALLBACK_CAMPUS_BOUNDS);
  });
});

describe("placesFromSnapshot", () => {
  it("convierte los locales con coordenadas y calcula precio, rating y distancia", () => {
    const origin: Coordinates = {
      latitude: CAMPUS_CENTER.latitude + 0.001,
      longitude: CAMPUS_CENTER.longitude,
    };
    const place = placesFromSnapshot(
      snapshot({
        establishments: [
          establishment({ photos: ["local/foto.webp"] }),
          establishment({
            id: "sin-coordenadas",
            slug: "sin-coordenadas",
            name: "Sin coordenadas",
            latitude: null,
          }),
        ],
        products: [
          product({ id: "p1", price_cop: 8000 }),
          product({ id: "p2", price_cop: 5000 }),
          product({
            id: "p3",
            establishment_id: "sin-coordenadas",
            price_cop: 1000,
          }),
        ],
        product_stats: [stats({ product_id: "p2", review_count: 2 })],
      }),
      origin,
    );

    expect(place).toHaveLength(1);
    expect(place[0]).toMatchObject({
      id: "establishment-1",
      photoPath: "local/foto.webp",
      priceFromCop: 5000,
      rating: 4.4,
      reviewCount: 2,
    });
    expect(place[0].distanceMeters).toBeGreaterThan(100);
  });

  it("ordena por nombre y deja precio/rating nulos si no hay datos", () => {
    const places = placesFromSnapshot(
      snapshot({
        establishments: [
          establishment({ id: "b", slug: "b", name: "Zeta" }),
          establishment({ id: "a", slug: "a", name: "Alfa" }),
        ],
      }),
    );

    expect(places.map((place) => place.name)).toEqual(["Alfa", "Zeta"]);
    expect(places[0]).toMatchObject({
      priceFromCop: null,
      rating: null,
      reviewCount: 0,
    });
  });

  it("devuelve una lista vacía sin establecimientos válidos", () => {
    expect(placesFromSnapshot(snapshot())).toEqual([]);
  });
});
