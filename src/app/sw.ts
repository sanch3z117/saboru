/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type {
  PrecacheEntry,
  RouteHandlerCallbackOptions,
  SerwistGlobalConfig,
} from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

import {
  OFFLINE_IMAGE_CACHE,
  cacheStrategyFor,
  isRequiresConnectionPath,
  legacyCachesToDelete,
  type CacheRuleInput,
} from "@/lib/offline/cache-rules";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

function ruleInput({
  url,
  request,
  sameOrigin,
}: {
  url: URL;
  request: Request;
  sameOrigin: boolean;
}): CacheRuleInput {
  return {
    url: url.href,
    method: request.method,
    sameOrigin,
    destination: request.destination,
    rsc: request.headers.get("RSC") === "1",
  };
}

const controller: { serwist?: Serwist } = {};

const REQUIRES_CONNECTION_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Requiere conexión · SaborU</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fff6e5; color: #2b2b2b; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; }
  main { max-width: 34rem; }
  .brand { font-weight: 700; font-size: .875rem; }
  h1 { font-size: 2.5rem; line-height: 1.05; margin: .75rem 0 0; }
  p { line-height: 1.6; color: rgba(43, 43, 43, .8); }
  a { color: #2b2b2b; font-weight: 600; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
</style>
</head>
<body>
<main>
  <p class="brand">SaborU</p>
  <h1>Requiere conexión</h1>
  <p>El panel y las pantallas de cuenta necesitan internet. No mostramos datos guardados de tu sesión aquí. Vuelve a conectarte para continuar.</p>
  <div class="actions">
    <a href="/offline">Ver catálogo sin conexión</a>
  </div>
</main>
</body>
</html>`;

/**
 * Navegación: red; si falla, sirve el gate sin sesión en rutas de cuenta y el
 * catálogo `/offline` en las públicas. El gate va inline para no depender de
 * una respuesta cacheada ni de una redirección en plena navegación.
 */
async function handleNavigation({
  request,
  url,
  event,
}: RouteHandlerCallbackOptions) {
  const requiresConnection = isRequiresConnectionPath(url.pathname);

  try {
    if (!requiresConnection && "preloadResponse" in event) {
      const preload = await (
        event as FetchEvent
      ).preloadResponse?.catch(() => undefined);
      if (preload) return preload;
    }
    return await fetch(request, { cache: "no-store" });
  } catch {
    if (requiresConnection) {
      return new Response(REQUIRES_CONNECTION_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "x-saboru-fallback": "gate",
        },
      });
    }

    const offline = await controller.serwist?.matchPrecache("/offline");
    if (!offline) return Response.error();
    const headers = new Headers(offline.headers);
    headers.set("x-saboru-fallback", "offline");
    return new Response(offline.body, {
      status: offline.status,
      headers,
    });
  }
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  // Actualización controlada: la app pide SKIP_WAITING cuando el usuario acepta.
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && isRequiresConnectionPath(url.pathname),
      handler: handleNavigation,
    },
    {
      matcher: (context) =>
        cacheStrategyFor(ruleInput(context)) === "image",
      handler: new CacheFirst({
        cacheName: OFFLINE_IMAGE_CACHE,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    {
      // RSC, API y Supabase: solo red.
      matcher: (context) =>
        cacheStrategyFor(ruleInput(context)) === "network-only",
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Cachés de la versión anterior (pages/pages-rsc/others…) fuera.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const stale = legacyCachesToDelete(names, [OFFLINE_IMAGE_CACHE]);
      await Promise.all(stale.map((name) => caches.delete(name)));
    })(),
  );
});

controller.serwist = serwist;
serwist.addEventListeners();
