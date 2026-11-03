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

  // Navegaciones y documentos: red; si falla, Serwist sirve `/offline`.
  return "network-only";
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
