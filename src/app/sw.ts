/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

import {
  OFFLINE_IMAGE_CACHE,
  cacheStrategyFor,
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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  // Actualización controlada: la app pide SKIP_WAITING cuando el usuario acepta.
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: true,
  runtimeCaching: [
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
      // Navegación, RSC, API y Supabase: solo red. Si falla una navegación,
      // Serwist sirve `/offline` (precacheado, sin datos de sesión).
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

serwist.addEventListeners();
