# SaborU — Offline y PWA

> Especificación del funcionamiento sin conexión. Reglas de seguridad: `AGENTS.md` (regla 13). Datos y endpoints: `docs/03`.
> Antes de usar la API de Serwist, Next.js o `idb`, consulta la documentación vigente y fija versiones exactas.

## Objetivo

Tras la primera visita con conexión, el estudiante puede abrir la app instalada, buscar, ver fichas y escribir reseñas, favoritos y reportes sin internet. Lo escrito se envía solo al volver la red. Los datos privados nunca quedan guardados al cerrar sesión.

## Capas

| Capa                  | Dónde vive                     | Qué guarda                                                                          |
| --------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| App shell y estáticos | Cache Storage (service worker) | JS, CSS, fuentes, iconos, imagen de reemplazo, página `/offline`                    |
| Catálogo público      | IndexedDB (`snapshot`)         | Establecimientos, productos, bloques, estadísticas y reseñas recientes **públicas** |
| Fotos                 | Cache Storage (con límite)     | Solo las ya vistas                                                                  |
| Cola de envío         | IndexedDB (`outbox`)           | Reseñas, favoritos y reportes pendientes, **asociados al `user_id`**                |
| Favoritos locales     | IndexedDB (`favorites`)        | Copia de los del usuario, asociada a su `user_id`                                   |

El service worker (`src/app/sw.ts`) solo maneja red y caché. **No contiene lógica de negocio ni claves.** La búsqueda corre en la página con la función pura `src/lib/catalog/search.ts`.

## Manifest

`src/app/manifest.ts` con `name`, `short_name` ("SaborU"), `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`, `lang: "es"`, iconos 192, 512 y maskable. Instalable verificado con Lighthouse/DevTools.

## Service worker (Serwist)

- Precache del app shell generado en el build (`@serwist/next`), con
  `precacheOptions: { cleanupOutdatedCaches: true }`; `/offline` entra como
  entrada adicional (`next.config.ts`).
- **Desactivado en `npm run dev`.** Se prueba con `npm run build && npm run start`.
- Config: `skipWaiting: false`, `clientsClaim: false`, `navigationPreload: true`,
  `fallbacks` a `/offline` y `runtimeCaching` construido a partir de
  `src/lib/offline/cache-rules.ts`.
- Actualización controlada: con `skipWaiting: false` el SW nuevo queda en
  `waiting`; Serwist ya escucha el mensaje `SKIP_WAITING`. El componente
  `src/components/offline/service-worker-update.tsx` muestra el aviso "Hay una
  versión nueva de SaborU" y solo envía el mensaje cuando el usuario pulsa
  "Actualizar". `src/lib/offline/update-guard.ts` bloquea el botón mientras un
  formulario o un envío esté en curso. Al activarse la versión nueva se recarga
  una sola vez (`controllerchange`).
- Limpieza de cachés de versiones anteriores al activar: `legacyCachesToDelete`
  borra `pages`, `pages-rsc`, `pages-rsc-prefetch`, `others`, `apis`,
  `next-data`, `next-image`, `static-*`, `google-fonts-*` y `cross-origin`;
  conserva el precache y `public-images`.

### Estrategias por tipo de recurso

| Recurso                                                                | Estrategia                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Estáticos con hash (`/_next/static/*`), app shell, iconos y `/offline` | Precache del manifest                                                  |
| Fotos e imágenes públicas                                              | Cache-first, máx. ≈60 entradas y 30 días; imagen de reemplazo si falla |
| Navegaciones a cualquier ruta de la app y peticiones RSC               | Network-only (sin caché)                                               |
| `GET /api/catalog/snapshot`                                            | Network-only; la página lo guarda en IndexedDB                         |
| Cualquier petición a Supabase (Auth, REST, RPC, Storage)               | Network-only                                                           |

Las páginas de la app devuelven contenido distinto según la sesión (por ejemplo la
reseña propia o el formulario de `/producto/*`), así que **no se cachean** ni su HTML
ni su payload RSC: un payload viejo dejaría la UI mostrando datos que ya cambiaron.
El respaldo `/offline` se sirve solo cuando una navegación falla por falta de red.
El offline real (snapshot de catálogo, búsqueda, outbox y limpieza al cerrar sesión)
llega completo en la Fase 6.

### Nunca se cachea (lista de exclusión, probada)

La lista vive en `src/lib/offline/cache-rules.ts` (`cacheStrategyFor`) y tiene
pruebas unitarias en `tests/unit/offline-cache-rules.test.ts`. El service worker
aplica esa decisión; no hay otra copia de las reglas.

- Navegaciones HTML y peticiones RSC de todas las rutas (`/`, `/buscar`, `/producto/*`,
  `/establecimiento/*`, `/panel/*`, `/admin/*`, `/auth/*`, `/login`, `/registro*`,
  `/offline`).
- `/api/sync` y cualquier método distinto de `GET`.
- Peticiones a Supabase Auth, REST, RPC o Storage privado.
- Respuestas con `Set-Cookie`, con `Authorization` o con `Cache-Control: private/no-store`.
- Respuestas no `ok` (4xx/5xx) y respuestas opacas.

Solo se cachean las imágenes públicas (fotos ya vistas) y el precache del app
shell. El HTML cacheado **no debe contener datos del usuario**.

### Punto de entrada offline

`/offline` es el shell público precacheado (sin datos de sesión) y la app de
búsqueda sin conexión: carga el snapshot de IndexedDB, filtra con
`snapshotToSearchItems` + `searchCatalog` (presupuesto, bloque, categoría y
“abierto ahora”) y muestra la ficha en el mismo panel. No navega a `/producto/*`
ni `/establecimiento/*` (son NetworkOnly) y no muestra datos de sesión.
Sin snapshot muestra “Vuelve a conectarte para descargar el catálogo.”; si el
registro está corrupto o la cuota lo impide, se explica y se ofrece reintentar.
Queda prohibido dejar `NetworkOnly` sin el fallback `/offline`.

## Snapshot local del catálogo

- Se descarga de `GET /api/catalog/snapshot` en la primera visita y se refresca en segundo plano al abrir la app con conexión (si cambió `version`).
- Se guarda en IndexedDB (`src/lib/offline/db.ts`, store `snapshot`) como
  `{ id: "catalog", snapshot, savedAt }` con `version` y `generated_at`; la UI
  muestra “Catálogo actualizado el …” (America/Bogota) cuando usa el snapshot.
- El refresco (`src/lib/offline/snapshot-store.ts`) corre al montar `/`, `/buscar`
  y `/offline`, al volver `online` y al volver a la pestaña. No reescribe si la
  `version` es la misma.
- Nunca lanza ni reintenta en bucle: error de red, HTTP no-OK, JSON inválido o
  `QuotaExceededError` devuelven un resultado y **se conserva el snapshot
  anterior**. Si la cuota impide guardar, se avisa y la app sigue en línea.
- Contiene solo datos públicos; sin `user_id`, sin correos.
- Si el almacenamiento falla (cuota), la app sigue funcionando en línea y avisa con un mensaje claro.
- Tamaño de referencia: 20 establecimientos y 200 productos deben quedar muy por debajo de 5 MB.

### Del snapshot a `CatalogSearchItem`

`src/lib/offline/snapshot.ts` (`snapshotToSearchItems`) convierte el snapshot en
los mismos ítems que devuelve `search_products`:

- une cada producto disponible con su establecimiento;
- calcula `distance_m` con haversine (`src/lib/catalog/distance.ts`) desde el
  bloque elegido, porque offline no hay PostGIS;
- conserva `establishment_schedule` para el filtro “abierto ahora”;
- descarta productos agotados o sin establecimiento.

La prueba de paridad (`tests/integration/offline-parity.test.ts`) compara, con
los mismos datos, los ids y el orden del RPC `search_products` contra
`snapshotToSearchItems` + `searchCatalog` (presupuesto, categoría y horario).

## Búsqueda offline

`search(snapshot, filtros)` es una función pura: presupuesto, distancia al bloque (fórmula haversine en `lib/utils/distance.ts`), categoría, abierto ahora (`isOpenNow`) y orden. Mismos resultados que el RPC online con los mismos datos. Sin mapa interactivo: se muestra el bloque y la distancia en texto.

## Cola de envío (outbox)

Registro en IndexedDB:

```ts
type OutboxItem = {
  clientId: string; // uuid v4 generado al crear; idempotencia
  userId: string; // dueño de la operación
  type: "review" | "favorite" | "report";
  payload: unknown; // validado con Zod antes de guardar
  status: "pending" | "sending" | "rejected";
  errorCode?: string; // ej. review_cooldown
  attempts: number;
  createdAt: number; // solo informativo; el servidor decide la hora real
};
```

Flujo:

1. Al crear (con o sin red) se valida con Zod en el cliente y se guarda en `outbox` con `pending`. La UI muestra **"Pendiente de envío"**.
2. Si hay red y sesión, se intenta enviar de inmediato.
3. Disparadores de sincronización: evento `online`, `visibilitychange` (volver a la app) y al abrir la app. **No depender de Background Sync**: no existe en iOS/Safari. Si está disponible puede usarse como mejora.
4. Se envía un lote (máx. 20) a `POST /api/sync` con cookies de sesión.
5. Respuesta por operación:
   - `ok` o `duplicate` → se elimina de la cola; la UI pasa a "Publicada" y aparece la insignia "Reseña verificada".
   - `rejected` (`review_cooldown`, `product_unavailable`, `invalid`, `forbidden`) → se marca `rejected` y se explica al usuario con un mensaje claro; **no se reintenta**.
   - Error de red o 5xx → sigue `pending`, reintento con espera exponencial (máx. ≈5 intentos por ciclo).
   - 401 (sesión vencida) → se conserva la cola y se pide iniciar sesión; no se descarta nada.
6. Un `sending` huérfano (cierre de la app a mitad) vuelve a `pending` al iniciar.
7. Un envío solo procesa operaciones del `userId` de la sesión actual.

Reglas de negocio (30 días, dominio, estado) se aplican **en el servidor y en la base**, nunca confiando en lo que dice el cliente. Si dos operaciones offline chocan con la regla de 30 días, gana la primera que llegue.

## Qué se puede hacer sin conexión

Ver la tabla de `docs/01-ALCANCE-MVP.md`. Resumen: abrir, buscar, ver fichas y fotos vistas, y crear reseñas/favoritos/reportes en cola. **No** hay login, registro, panel de vendedor, panel admin ni mapa interactivo sin conexión; esas pantallas muestran "Requiere conexión" sin datos.

La sesión de Supabase persiste en cookies; sin red no se puede renovar, pero la app sigue mostrando el catálogo. Al volver la red se renueva o se pide iniciar sesión.

## Cierre de sesión y privacidad

Al cerrar sesión (y cuando cambie el usuario autenticado), `lib/offline/cleanup.ts`:

1. Borra `outbox` y `favorites` locales del usuario (si hay elementos `pending`, **avisar antes** y ofrecer enviarlos si hay red).
2. Borra cachés que pudieran tener datos privados (`caches.delete` de las privadas).
3. Mantiene el snapshot público (no contiene datos personales).
4. Probado: tras cerrar sesión no queda ningún dato de usuario en IndexedDB ni en Cache Storage, y `/panel` no muestra datos.

Se ejecuta en **los dos caminos** de cierre de sesión:

- menú de sesión del navegador (`SessionMenu`), que llama a `supabase.auth.signOut()`;
- `SignOutButton`, que limpia y luego invoca la server action `signOutAction`.

Además, `/login` monta `SessionCleanup`: si no hay sesión (por ejemplo tras la
server action, que redirige), vuelve a limpiar. Es la red de seguridad para
cualquier cierre o sesión vencida. `cleanupLocalUserData` borra los datos de
todos los usuarios del dispositivo y es idempotente.

Un segundo usuario en el mismo dispositivo nunca ve ni envía la cola del primero (`userId` en cada registro).

## Límites y mantenimiento

- Fotos: tope de entradas y edad (ver tabla); al exceder se descartan las más antiguas.
- Solicitar almacenamiento persistente (`navigator.storage.persist()`) solo si es útil y sin molestar al usuario.
- Control de versión del esquema de IndexedDB con migraciones simples (`idb` `upgrade`).
- Manejo de `QuotaExceededError` en todas las escrituras.

## Particularidades de plataforma

- **Android/Chrome:** instalación con `beforeinstallprompt` (mostrar botón "Instalar" opcional).
- **iOS/Safari:** instalación manual desde "Compartir → Añadir a pantalla de inicio"; el almacenamiento puede borrarse tras un tiempo sin uso. Sin Background Sync. Se verifica a mano en un iPhone si es posible.
- Mostrar un indicador discreto de estado: "Sin conexión" / "Sincronizando…" / "Todo enviado".

## Pruebas

### Unitarias (Vitest + `fake-indexeddb`)

- Búsqueda pura: presupuesto, distancia, categoría, abierto ahora (incluye cruce de medianoche y día cerrado).
- Snapshot: `snapshotToSearchItems` (join con establecimiento, `distance_m` por haversine, `establishment_schedule`, descarte de agotados/huérfanos).
- Store del snapshot: guardar/leer, no reescribir con la misma `version`, registro corrupto, error de red, HTTP no-OK, JSON inválido y `QuotaExceededError` sin perder el snapshot anterior.
- Outbox: encolar, reintentar, `duplicate`, `rejected` sin reintento, `sending` huérfano, aislamiento por `userId`.
- Limpieza al cerrar sesión: outbox y favoritos vacíos, snapshot conservado, cachés privadas borradas, idempotencia.
- Reglas de la lista de exclusión del service worker (función pura que decide si una petición es cacheable).

### Integración (Vitest contra Supabase local)

- Paridad online/offline: con los mismos datos, `search_products` y
  `snapshotToSearchItems` + `searchCatalog` devuelven los mismos ids en el mismo
  orden (presupuesto, categoría y horario).

### E2E (Playwright, sobre `build` + `start`)

Usar `context.setOffline(true)`; el service worker debe estar permitido en la configuración.
La suite corre con `workers: 1`: comparte service worker e IndexedDB y en paralelo
es inestable en máquinas lentas.

1. **Lectura offline:** visita con red → se corta la red → recarga → buscar por presupuesto → abrir una ficha completa. Se prueba `/offline` sin snapshot (“Vuelve a conectarte para descargar el catálogo.”) y con snapshot (app de búsqueda y ficha en el panel).
2. **Escritura offline:** sin red, escribir una reseña → "Pendiente de envío" → volver la red → se publica y aparece "Reseña verificada".
3. **Privacidad:** cerrar sesión desde el menú y desde `/admin` (server action) → IndexedDB y cachés sin datos privados, snapshot conservado; `/panel` sin red muestra "Requiere conexión".
4. **Regla de 30 días offline:** dos reseñas offline del mismo producto → la segunda queda `rejected` con mensaje claro.
5. **Actualización:** con una versión nueva en espera, aparece el aviso y no recarga sola.
6. **Instalabilidad:** manifest válido y SW activo.

Verificación manual: Android con Chrome (instalación y uso real sin datos) e iPhone con Safari si es posible.

## No hacer

- No probar offline con `npm run dev`.
- No cachear respuestas autenticadas ni de Supabase.
- No guardar `service_role` ni secretos en el SW o en IndexedDB.
- No confiar en la hora del dispositivo para reglas de negocio.
- No descartar operaciones de la cola por errores de red o sesión vencida.
- No recargar la app por una actualización del SW sin que el usuario lo acepte.
