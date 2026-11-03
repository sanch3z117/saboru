/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Fotos públicas e iconos: cache-first con caducidad.
      matcher: ({ request }) =>
        request.destination === "image" ||
        /\.(?:png|jpe?g|webp|svg|ico|gif)$/i.test(request.url),
      handler: new CacheFirst({
        cacheName: "public-images",
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
      // Todo lo demás del mismo origen (navegaciones, RSC y API): solo red.
      // Las páginas de la app incluyen datos de la sesión, así que no se
      // cachean; el soporte offline completo llega en la Fase 6.
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.method === "GET",
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

serwist.addEventListeners();
