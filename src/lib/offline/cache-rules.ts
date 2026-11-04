export type CacheStrategy = "precache" | "image" | "network-only";

export type CacheRuleInput = {
  url: string;
  method: string;
  sameOrigin: boolean;
  destination?: string;
  rsc?: boolean;
};

export const OFFLINE_IMAGE_CACHE = "public-images";

const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|svg|ico|gif|avif)$/i;

/**
 * Teselas, estilos, sprites y glifos del mapa. Nunca entran al cache del
 * service worker: el mapa es online-only (docs/04).
 */
export function isMapAssetUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "tile.openstreetmap.org" ||
    hostname.endsWith(".tile.openstreetmap.org") ||
    hostname === "maptiler.com" ||
    hostname.endsWith(".maptiler.com")
  );
}

/**
 * Decide qué hace el service worker con una petición. Es la fuente única de la
 * lista de exclusión de `docs/04`: nada de HTML ni RSC de la app se cachea.
 */
export function cacheStrategyFor(input: CacheRuleInput): CacheStrategy {
  if (input.method.toUpperCase() !== "GET") {
    return "network-only";
  }

  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return "network-only";
  }

  // Payloads RSC: llevan datos de la sesión (reseña propia, formularios).
  if (input.rsc || url.searchParams.has("_rsc")) {
    return "network-only";
  }

  const isImage =
    input.destination === "image" || IMAGE_EXTENSION.test(url.pathname);

  if (isMapAssetUrl(url)) {
    return "network-only";
  }

  if (!input.sameOrigin) {
    // Solo fotos públicas; cualquier API de Supabase va a la red.
    return isImage ? "image" : "network-only";
  }

  if (url.pathname.startsWith("/_next/static/")) {
    return "precache";
  }

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/panel" ||
    url.pathname.startsWith("/panel/") ||
    url.pathname === "/admin" ||
    url.pathname.startsWith("/admin/") ||
    url.pathname === "/login" ||
    url.pathname.startsWith("/registro") ||
    url.pathname === "/offline"
  ) {
    return "network-only";
  }

  if (isImage) {
    return "image";
  }

  // Navegaciones y documentos: red; si falla, Serwist sirve el fallback.
  return "network-only";
}

const REQUIRES_CONNECTION_PREFIXES = [
  "/panel",
  "/admin",
  "/login",
  "/registro",
  "/auth",
];

/** Rutas privadas/de cuenta: offline se sirve `/requiere-conexion`. */
export function isRequiresConnectionPath(pathname: string) {
  return REQUIRES_CONNECTION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const LEGACY_CACHE_PREFIXES = [
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "others",
  "apis",
  "next-data",
  "next-image",
  "static-image-assets",
  "static-js-assets",
  "static-style-assets",
  "static-font-assets",
  "static-audio-assets",
  "static-video-assets",
  "google-fonts-webfonts",
  "google-fonts-stylesheets",
  "cross-origin",
];

/** Cachés de versiones anteriores (antes de 6.1) que hay que borrar. */
export function legacyCachesToDelete(
  cacheNames: string[],
  keep: string[] = [],
): string[] {
  return cacheNames.filter((name) => {
    if (keep.includes(name)) {
      return false;
    }
    return LEGACY_CACHE_PREFIXES.some(
      (prefix) => name === prefix || name.startsWith(`${prefix}-`),
    );
  });
}
