import { describe, expect, it } from "vitest";

import {
  cacheStrategyFor,
  isRequiresConnectionPath,
  legacyCachesToDelete,
} from "@/lib/offline/cache-rules";

const ORIGIN = "http://127.0.0.1:3000";

function rule(
  path: string,
  overrides: Partial<Parameters<typeof cacheStrategyFor>[0]> = {},
) {
  return cacheStrategyFor({
    url: `${ORIGIN}${path}`,
    method: "GET",
    sameOrigin: true,
    ...overrides,
  });
}

describe("política de caché del service worker", () => {
  it("nunca cachea HTML ni RSC de la app", () => {
    for (const path of [
      "/",
      "/buscar?presupuesto=9000",
      "/producto/abc",
      "/establecimiento/central",
      "/panel",
      "/panel/productos",
      "/admin",
      "/login",
      "/registro",
      "/registro/vendedor",
      "/offline",
    ]) {
      expect(rule(path)).toBe("network-only");
    }

    expect(rule("/producto/abc", { rsc: true })).toBe("network-only");
    expect(rule("/producto/abc?_rsc=hash")).toBe("network-only");
    expect(rule("/?_rsc=hash", { destination: "document" })).toBe(
      "network-only",
    );
  });

  it("precachea estáticos con hash y cachea solo imágenes públicas", () => {
    expect(rule("/_next/static/chunks/main.js")).toBe("precache");
    expect(rule("/brand/logo.svg")).toBe("image");
    expect(rule("/foto.png", { destination: "image" })).toBe("image");
    expect(
      cacheStrategyFor({
        url: "https://cdn.example.com/foto.webp",
        method: "GET",
        sameOrigin: false,
      }),
    ).toBe("image");
    expect(
      cacheStrategyFor({
        url: "https://proyecto.supabase.co/rest/v1/products",
        method: "GET",
        sameOrigin: false,
      }),
    ).toBe("network-only");
  });

  it("manda a la red API, auth, mutaciones y métodos distintos de GET", () => {
    expect(rule("/api/catalog/snapshot")).toBe("network-only");
    expect(rule("/api/sync")).toBe("network-only");
    expect(rule("/auth/callback")).toBe("network-only");
    expect(rule("/producto/abc", { method: "POST" })).toBe("network-only");
    expect(rule("/favicon.ico", { method: "HEAD" })).toBe("network-only");
  });
});

describe("rutas que requieren conexión", () => {
  it("marca panel, admin y auth", () => {
    for (const path of [
      "/panel",
      "/panel/productos",
      "/admin",
      "/admin/reportes",
      "/login",
      "/registro",
      "/registro/vendedor",
      "/auth/callback",
    ]) {
      expect(isRequiresConnectionPath(path)).toBe(true);
    }

    for (const path of ["/", "/buscar", "/producto/abc", "/offline"]) {
      expect(isRequiresConnectionPath(path)).toBe(false);
    }
  });
});

describe("limpieza de cachés anteriores a 6.1", () => {
  it("borra las cachés del defaultCache y conserva precache e imágenes", () => {
    const names = [
      "serwist-precache-v2-http://localhost:3000/",
      "public-images",
      "pages",
      "pages-rsc",
      "pages-rsc-prefetch",
      "others",
      "apis",
      "next-data",
      "next-image",
      "google-fonts-stylesheets",
      "static-image-assets",
    ];

    expect(legacyCachesToDelete(names)).toEqual([
      "pages",
      "pages-rsc",
      "pages-rsc-prefetch",
      "others",
      "apis",
      "next-data",
      "next-image",
      "google-fonts-stylesheets",
      "static-image-assets",
    ]);
  });

  it("permite conservar una caché explícita", () => {
    expect(legacyCachesToDelete(["pages", "public-images"], ["pages"])).toEqual(
      [],
    );
  });
});
