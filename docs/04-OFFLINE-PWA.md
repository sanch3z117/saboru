# SaborU — Offline y PWA

> Especificación del funcionamiento sin conexión. Reglas de seguridad: `AGENTS.md` (regla 13). Datos y endpoints: `docs/03`.
> Antes de usar la API de Serwist, Next.js o `idb`, consulta la documentación vigente y fija versiones exactas.

## Objetivo

Tras la primera visita con conexión, el estudiante puede abrir la app instalada, buscar, ver fichas y escribir reseñas, favoritos y reportes sin internet. Lo escrito se envía solo al volver la red. Los datos privados nunca quedan guardados al cerrar sesión.

## Capas

| Capa                  | Dónde vive                       | Qué guarda                                                                          |
| --------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| App shell y estáticos | Cache Storage (service worker)   | JS, CSS, fuentes, iconos, imagen de reemplazo, `/offline` y `/requiere-conexion`    |
| Catálogo público      | IndexedDB (`snapshot`)           | Establecimientos, productos, bloques, estadísticas y reseñas recientes **públicas** |
| Fotos                 | Cache Storage (con límite)       | Solo las ya vistas                                                                  |
| Cola de envío         | IndexedDB (`outbox`)             | Reseñas, favoritos y reportes pendientes, **asociados al `user_id`**                |
| Favoritos locales     | IndexedDB (`favorites`)          | Copia de los del usuario, asociada a su `user_id`                                   |
| Sesión visible        | `localStorage` (`saboru:viewer`) | `userId`, correo, rol y `canReview` del último usuario; se borra al cerrar sesión   |

El service worker (`src/app/sw.ts`) solo maneja red y caché. **No contiene lógica de negocio ni claves.** La búsqueda corre en la página con la función pura `src/lib/catalog/search.ts`.

## Manifest

`src/app/manifest.ts` con `name`, `short_name` ("SaborU"), `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`, `lang: "es"`, iconos 192, 512 y maskable. Instalable verificado con Lighthouse/DevTools.

## Service worker (Serwist)

- Precache del app shell generado en el build (`@serwist/next`), con
  `precacheOptions: { cleanupOutdatedCaches: true }`; `/offline` y
  `/requiere-conexion` entran como entradas adicionales (`next.config.ts`).
- **Desactivado en `npm run dev`.** Se prueba con `npm run build && npm run start`.
- Config: `skipWaiting: false`, `clientsClaim: false`, `navigationPreload: false`
  (el handler de navegación decide red/fallback y evita carreras con la
  precarga) y `runtimeCaching` construido a partir de
  `src/lib/offline/cache-rules.ts`.
- Las navegaciones a `/panel*`, `/admin*`, `/login`, `/registro*` y `/auth/*`
  que fallan por red sirven la respuesta precacheada de `/requiere-conexion`:
  HTML estático, sin JavaScript, sin sesión y sin datos. La respuesta lleva
  `x-saboru-fallback: gate` para poder probarla. No se redirige a `/login` ni se
  sirve `/offline` en esas rutas.
- `/requiere-conexion` es un route handler estático (`route.ts`), precacheado;
  no depende de hidratar React para responder a las rutas privadas.
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

| Recurso                                                                                  | Estrategia                                                             |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Estáticos con hash, app shell, iconos, `/offline` y `/requiere-conexion`                 | Precache del manifest                                                  |
| Fotos e imágenes públicas                                                                | Cache-first, máx. ≈60 entradas y 30 días; imagen de reemplazo si falla |
| Navegaciones a rutas públicas y peticiones RSC                                           | Network-only; si falla la red, precache `/offline`                     |
| Navegaciones a rutas de cuenta (`/panel*`, `/admin*`, `/login`, `/registro*`, `/auth/*`) | Network-only; si falla la red, `/requiere-conexion` precacheada        |
| `GET /api/catalog/snapshot` y `GET /api/viewer`                                          | Network-only; la página guarda snapshot y viewer en IndexedDB/storage  |
| Teselas, estilos, sprites y glifos de OpenStreetMap/MapTiler                             | Network-only; nunca se cachean (el mapa es online-only)                |
| Cualquier petición a Supabase (Auth, REST, RPC, Storage)                                 | Network-only                                                           |

Las páginas de la app devuelven contenido distinto según la sesión (por ejemplo la
reseña propia o el formulario de `/producto/*`), así que **no se cachean** ni su HTML
ni su payload RSC: un payload viejo dejaría la UI mostrando datos que ya cambiaron.
El respaldo `/offline` se sirve solo cuando falla una navegación pública; las rutas
de cuenta reciben el documento precacheado “Requiere conexión” sin sesión. El offline completo (snapshot,
búsqueda, outbox, gate y limpieza al cerrar sesión) está implementado en la Fase 6.

### Nunca se cachea (lista de exclusión, probada)

La lista vive en `src/lib/offline/cache-rules.ts` (`cacheStrategyFor`) y tiene
pruebas unitarias en `tests/unit/offline-cache-rules.test.ts`. El service worker
aplica esa decisión; no hay otra copia de las reglas.

- Navegaciones HTML y peticiones RSC de todas las rutas (`/`, `/buscar`, `/producto/*`,
  `/establecimiento/*`, `/panel/*`, `/admin/*`, `/auth/*`, `/login`, `/registro*`,
  `/offline`).
- `/api/sync`, `/api/viewer` y cualquier método distinto de `GET`.
- Peticiones a Supabase Auth, REST, RPC o Storage privado.
- Teselas, estilos, sprites y glifos de OpenStreetMap y MapTiler (`tile.openstreetmap.org`, `*.maptiler.com`); el mapa no tiene copia offline.
- Respuestas con `Set-Cookie`, con `Authorization` o con `Cache-Control: private/no-store`.
- Respuestas no `ok` (4xx/5xx) y respuestas opacas.

Solo se cachean las imágenes públicas (fotos ya vistas) y el precache del app
shell. El HTML cacheado **no debe contener datos del usuario**.

### Puntos de entrada offline

`/offline` es el shell público precacheado (sin datos de sesión) y la app de
búsqueda sin conexión: carga el snapshot de IndexedDB, filtra con
`snapshotToSearchItems` + `searchCatalog` (presupuesto, bloque, categoría y
“abierto ahora”) y muestra la ficha en el mismo panel. No navega a `/producto/*`
ni `/establecimiento/*` (son NetworkOnly), no muestra datos de sesión y no
incluye el mapa: el mapa es online-only y no lee IndexedDB.
Sin snapshot muestra “Vuelve a conectarte para descargar el catálogo.”; si el
registro está corrupto o la cuota lo impide, se explica y se ofrece reintentar.
Queda prohibido dejar `NetworkOnly` sin el fallback `/offline`.

### Rutas que requieren conexión

`isRequiresConnectionPath` (`src/lib/offline/cache-rules.ts`) reconoce `/panel`,
`/admin`, `/login`, `/registro` y `/auth` con sus subrutas. Sin red, el service
worker sirve la respuesta precacheada de `/requiere-conexion` en lugar de
`/offline`: un documento estático con el texto “Requiere conexión”, enlace al
catálogo offline y **sin** JavaScript, cookies, correo, rol ni botones de sesión.
La respuesta lleva `x-saboru-fallback: gate` (solo para pruebas) y
`Cache-Control: public, max-age=0, must-revalidate` para que el precache la
guarde.

No se redirige a `/login` (offline no se puede autenticar y el destino se
perdería). `OfflineCatalog` repite la comprobación con
`window.location.pathname` como red de seguridad si el cuerpo de `/offline`
llegara a servirse en una URL privada. `/requiere-conexion` es un route handler
estático, precacheado y disponible como entrada directa; el service worker no
depende de hidratar React.

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

`searchCatalog(items, filtros)` es una función pura: presupuesto, distancia desde el bloque (fórmula haversine en `src/lib/catalog/distance.ts`), categoría, abierto ahora (`isOpenAt`), texto opcional y orden. Mismos resultados que el RPC con los mismos datos. La pantalla `/offline` usa el bloque y muestra la distancia en texto, sin mapa.

El descubrimiento online de `/` y `/buscar` también usa el snapshot y `searchCatalog`, pero no lee IndexedDB ni monta el mapa sin red. Si la conexión se corta con la página abierta, la lista en memoria sigue visible y el mapa se retira; una recarga sin red cae en el shell `/offline`.

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
   - `rejected` (`review_cooldown`, `product_unavailable`, `invalid`, `forbidden`, `rate_limited`) → se marca `rejected` y se explica al usuario con un mensaje claro; **no se reintenta**.
   - Error de red o 5xx → sigue `pending`, reintento con espera exponencial (máx. ≈5 intentos por ciclo).
   - 401 (sesión vencida) → se conserva la cola y se pide iniciar sesión; no se descarta nada.
6. Un `sending` huérfano (cierre de la app a mitad) vuelve a `pending` al iniciar.
7. Un envío solo procesa operaciones del `userId` de la sesión actual.
8. Se envían en orden de `createdAt` (la primera reseña de un producto gana la regla de 30 días).

Implementación (`src/lib/offline/outbox.ts`, `src/lib/offline/sync.ts`,
`src/app/api/sync/route.ts`, `src/server/services/sync.ts`):

- El `clientId` de la operación es el mismo que viaja en el payload de
  reseña/reporte (idempotencia); el de favoritos es local.
- `/api/sync` exige sesión (401), valida el lote con Zod, limita a **20 lotes/h
  por usuario** (`sync`) y aplica el límite por tipo (`review`, `report`,
  `favorite`); llama a los servicios de siempre (`createReview`, `reportReview`,
  `toggleFavorite`).
- **Favoritos es add/remove**: el payload es
  `{ action: "add" | "remove", establishmentId, productId }`. El alta duplicada
  (23505) se trata como `duplicate`; la baja sin filas, como `ok`. La copia
  local vive en el store `favorites` por `userId`.
- Las acciones solo se ofrecen si hay sesión y el usuario es estudiante: se usa
  el rol/`canReview` cacheado en `localStorage` (`saboru:viewer`). `GET
/api/viewer` (NetworkOnly) lo refresca al montar, al volver `online` y al
  volver a la pestaña (`ViewerRefresher`); si no hay sesión, borra la caché. Si
  no hay caché, se usa el dominio `@uptc.edu.co`. Vendedor y admin no ven el
  formulario; el servidor sigue validando con `is_institutional_student()`.
- El servicio de sync no registra `log_search` ni `log_product_view`.

Reglas de negocio (30 días, dominio, estado) se aplican **en el servidor y en la base**, nunca confiando en lo que dice el cliente. Si dos operaciones offline chocan con la regla de 30 días, gana la primera que llegue.

## Qué se puede hacer sin conexión

Ver la tabla de `docs/01-ALCANCE-MVP.md`. Resumen: abrir, buscar, ver fichas y fotos vistas, y crear reseñas/favoritos/reportes en cola. **No** hay login, registro, panel de vendedor, panel admin ni mapa interactivo sin conexión; esas pantallas muestran "Requiere conexión" sin datos.

La sesión de Supabase persiste en cookies; sin red no se puede renovar, pero la app sigue mostrando el catálogo. Al volver la red se renueva o se pide iniciar sesión.

## Cierre de sesión y privacidad

El cierre de sesión ocurre **siempre en cliente** (`useSignOut`, usado por
`SessionMenu` y `SignOutButton`), nunca en una server action: una server action no
puede tocar IndexedDB, el service worker ni el storage del navegador. El orden es
obligatorio:

1. `prepareLogout(userId)` (`src/lib/offline/logout.ts`): si hay red, intenta
   `syncOutbox`; si después quedan envíos `pending` o un `sending` huérfano,
   pide confirmación porque el cleanup los borrará. Si la persona cancela, no se
   cierra sesión.
2. `cleanupLocalUserData()` (`src/lib/offline/cleanup.ts`): vacía `outbox` y
   `favorites`, borra las cachés privadas y recorre `localStorage` y
   `sessionStorage` eliminando todas las claves `saboru:*` (viewer, avisos de
   guardado, etc.). Conserva el snapshot público y `public-images`.
3. `supabase.auth.signOut()`.
4. `router.push("/login")` y `router.refresh()`.

Al cambiar de usuario sin cerrar sesión, `SyncProvider` compara
`saboru:viewer.userId` con la sesión y ejecuta la misma limpieza antes de
sincronizar. `/login` monta `SessionCleanup`: si no hay sesión (otra pestaña,
sesión vencida), vuelve a limpiar. `cleanupLocalUserData` borra los datos de
todos los usuarios del dispositivo y es idempotente.

Probado en E2E: cierre desde el menú y desde `/admin`; después no quedan
`outbox`, `favorites`, `saboru:*` ni cachés privadas, el snapshot sigue, y
`/panel`/`/admin` sin sesión redirigen a `/login`.

Un segundo usuario en el mismo dispositivo nunca ve ni envía la cola del primero (`userId` en cada registro).

## Límites y mantenimiento

- Fotos: tope de entradas y edad (ver tabla); al exceder se descartan las más antiguas.
- Solicitar almacenamiento persistente (`navigator.storage.persist()`) solo si es útil y sin molestar al usuario.
- Control de versión del esquema de IndexedDB con migraciones simples (`idb` `upgrade`).
- Manejo de `QuotaExceededError` en todas las escrituras. El texto único vive en
  `src/lib/offline/quota.ts` (`QUOTA_MESSAGE`) y lo usan snapshot, reseñas y
  favoritos; `SnapshotRefresher` muestra un aviso descartable si el refresco
  falla por cuota.

## Particularidades de plataforma

- **Android/Chrome:** instalación con `beforeinstallprompt` (mostrar botón "Instalar" opcional).
- **iOS/Safari:** instalación manual desde "Compartir → Añadir a pantalla de inicio"; el almacenamiento puede borrarse tras un tiempo sin uso. Sin Background Sync. Se verifica a mano en un iPhone si es posible.
- Mostrar un indicador discreto de estado: "Sin conexión" / "Sincronizando…" / "Todo enviado".

## Pruebas

### Unitarias (Vitest + `fake-indexeddb`)

- Búsqueda pura: presupuesto, distancia, categoría, abierto ahora (incluye cruce de medianoche y día cerrado).
- Snapshot: `snapshotToSearchItems` (join con establecimiento, `distance_m` por haversine, `establishment_schedule`, descarte de agotados/huérfanos).
- Store del snapshot: guardar/leer, no reescribir con la misma `version`, registro corrupto, error de red, HTTP no-OK, JSON inválido y `QuotaExceededError` sin perder el snapshot anterior.
- Outbox: encolar, validación Zod, `duplicate`, `rejected` sin reintento, `sending` huérfano, aislamiento por `userId`, 401/red/5xx, backoff y favoritos add/remove locales.
- Limpieza al cerrar sesión: outbox y favoritos vacíos, snapshot conservado, cachés privadas borradas, claves `saboru:*` de `localStorage`/`sessionStorage` eliminadas, idempotencia.
- Reglas de la lista de exclusión del service worker y prefijos de rutas que requieren conexión (funciones puras).

### Integración (Vitest contra Supabase local)

- Paridad online/offline: con los mismos datos, `search_products` y
  `snapshotToSearchItems` + `searchCatalog` devuelven los mismos ids en el mismo
  orden (presupuesto, categoría y horario).
- `/api/sync` (servicios): idempotencia por `client_id` de reseñas y reportes,
  favorito add/remove idempotente, `review_cooldown`, límite por tipo, 20
  lotes/h y operaciones sin sesión rechazadas.

### E2E (Playwright, sobre `build` + `start`)

Usar `context.setOffline(true)`; el service worker debe estar permitido en la configuración.
La suite corre con `workers: 1`: comparte service worker e IndexedDB y en paralelo
es inestable en máquinas lentas.

1. **Lectura offline** — `offline-catalog.spec.ts`, `offline-shell.spec.ts`, `home.spec.ts`: visita con red → se corta la red → recarga → buscar por presupuesto → abrir una ficha completa. Se prueba `/offline` sin snapshot (“Vuelve a conectarte para descargar el catálogo.”), con snapshot, y la navegación pública que cae en `/offline`.
2. **Escritura offline** — `offline-write.spec.ts`: sin red, escribir una reseña → "Pendiente de envío" → volver la red → se publica y aparece "Reseña verificada"; reportar una reseña y guardar/quitar un favorito offline. Se comprueba también que admin y vendedor no ven el formulario.
3. **Privacidad** — `auth.spec.ts`, `offline-gate.spec.ts`: cierre de sesión desde el menú y desde `/admin` con el hook cliente → IndexedDB, `localStorage`/`sessionStorage` y cachés sin datos privados, snapshot conservado, y `/admin` redirige a `/login`. Sin red, la respuesta precacheada de `/requiere-conexion` cubre `/panel*`, `/admin*`, `/login`, `/registro*` y `/auth/*`; los prefijos se prueban en unitarias y la respuesta en `offline-gate.spec.ts`.
4. **Regla de 30 días offline** — `offline-write.spec.ts`: dos reseñas offline del mismo producto → la primera se publica y la segunda queda `rejected` con el mensaje de 30 días.
5. **Actualización** — `sw-update.spec.ts`: con una versión nueva en espera, aparece el aviso y no recarga sola; solo recarga al pulsar "Actualizar". Usa el SW de prueba `/api/e2e/sw-test`, disponible únicamente con `E2E_SW_TEST=1` (en producción responde 404).
6. **Instalabilidad** — `home.spec.ts`: manifest válido (nombre, `standalone`, `start_url`, iconos) y `/sw.js` servido como JavaScript; el SW activo se comprueba en las pruebas offline.

La suite completa se ejecutó en Chromium y en el perfil móvil (Pixel 7). La respuesta precacheada del gate se repitió con `--repeat-each=5` para descartar carreras con el service worker.

Verificación manual: queda pendiente en dispositivos físicos. En este entorno no hay Android ni iPhone disponibles, así que no se pudo comprobar la instalación real, el uso sin datos en modo avión ni el comportamiento de Safari iOS; debe hacerse antes de desplegar.

## No hacer

- No probar offline con `npm run dev`.
- No cachear respuestas autenticadas ni de Supabase.
- No guardar `service_role` ni secretos en el SW o en IndexedDB.
- No confiar en la hora del dispositivo para reglas de negocio.
- No descartar operaciones de la cola por errores de red o sesión vencida.
- No recargar la app por una actualización del SW sin que el usuario lo acepte.
