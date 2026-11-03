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

async function handleNavigation({
  request,
  url,
  event,
}: RouteHandlerCallbackOptions) {
  try {
    if ("preloadResponse" in event) {
      const preload = await (event as FetchEvent).preloadResponse?.catch(
        () => undefined,
      );
      if (preload) return preload;
    }
    return await fetch(request, { cache: "no-store" });
  } catch {
    if (isRequiresConnectionPath(url.pathname)) {
      const gate =
        await controller.serwist?.matchPrecache("/requiere-conexion");
      if (gate) return gate;
    }

    const offline = await controller.serwist?.matchPrecache("/offline");
    if (!offline) return Response.error();
    const headers = new Headers(offline.headers);
    headers.set("x-saboru-fallback", "offline");
    return new Response(offline.body, { status: offline.status, headers });
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
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: handleNavigation,
    },
    {
      matcher: (context) => cacheStrategyFor(ruleInput(context)) === "image",
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
