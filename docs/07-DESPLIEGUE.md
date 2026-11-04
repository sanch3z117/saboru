# Despliegue — SaborU

Estado: producción en Vercel desde GitHub, con Supabase Cloud, Upstash, Brevo y MapTiler en planes gratuitos. Sin dominio propio: se usa `https://saboru.vercel.app`.

## URLs y proyectos

| Recurso | Valor |
|---|---|
| App | `https://saboru.vercel.app` |
| Alias de producción | `https://saboru-bross7.vercel.app` |
| Vercel | proyecto `bross7/saboru`, conectado a `sanch3z117/saboru` |
| Supabase | `https://hbjrwxkezwflpcwgilen.supabase.co` (ref `hbjrwxkezwflpcwgilen`, `us-east-1`) |
| Upstash | Redis `saboru` (Free, `us-west-1`) |
| MapTiler | key `saboru-web`, restringida a los dominios de producción |
| Brevo | SMTP transaccional Free |

## Vercel

- Producción desde la rama `master` de GitHub. No se usa `vercel deploy` manual.
- Root Directory: `.`
- Framework: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Node.js: `24.x`

Variables (Production, Preview y Development; los secretos no se versionan):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)
- `NEXT_PUBLIC_SITE_URL=https://saboru.vercel.app`
- `NEXT_PUBLIC_MAPTILER_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `DEMO_ALLOW_ANY_EMAIL=true` **solo en Preview/demo**; nunca en Production.

No definir `RATE_LIMIT_DISABLED` ni `E2E_SW_TEST` en producción. `/api/e2e/sw-test` responde 404 cuando `E2E_SW_TEST` no vale `1`.

## Supabase Cloud

- 13 migraciones aplicadas en orden con `apply_migration`; el proyecto remoto usa Postgres 17 (el local usa 15).
- Seed aplicado una vez: 6 bloques, 7 establecimientos y 24 productos.
- Bucket público `establishment-photos` con límite de 5 MB y tipos JPEG/PNG/WebP.
- RLS activa en todas las tablas; se revisaron los advisors de seguridad y rendimiento. Los avisos de vistas/funciones `security definer` son deliberados (docs/03).
- La cuenta admin institucional se creó y se le asignó `role='admin'` manualmente. No se guarda en el repositorio.
- El bucket y las rutas de fotos se verificaron con la clave anónima y con el cliente de servidor.

## Auth y SMTP

- Site URL: `https://saboru.vercel.app`.
- Redirect URLs: `https://saboru.vercel.app/auth/callback`, `https://saboru-bross7.vercel.app/auth/callback` y el comodín `https://saboru-*-bross7.vercel.app/**` para previews/demo.
- SMTP propio activado en Supabase Auth con Brevo (`smtp-relay.brevo.com:587`).
- El remitente es una dirección de Gmail ya verificada en Brevo. `uptc.edu.co` no se pudo usar como remitente porque su política DMARC exige autenticación de dominio por DNS; la cuenta admin sigue siendo institucional.
- Brevo aceptó un envío de prueba al buzón admin. La entrega final se confirma revisando la bandeja y la carpeta de spam.
- Límite de correos de Supabase con SMTP propio: 30 por hora (ajustable en Auth → Rate Limits).

## Modo demo de correo (Fase 8.1)

- `DEMO_ALLOW_ANY_EMAIL` es una variable de servidor (sin `NEXT_PUBLIC_`). Solo se configura en el entorno Preview/demo y vale exactamente `true`.
- Con la bandera activa, `/registro` muestra “Modo demo: puedes registrarte con cualquier correo” y `requestStudentMagicLink` acepta cualquier correo. El servidor agrega el correo externo a `demo_email_allowlist` (solo `service_role`, caduca a los 15 minutos); `handle_new_user()` crea el perfil `student` y consume la fila. Sin la variable o con `false`, se mantiene `@uptc.edu.co`.
- La regla institucional sigue siendo la predeterminada: sin allowlist o invitación, un correo externo no crea perfil. Para preparar un admin Gmail: aceptar una invitación de vendedor y luego asignar `role='admin'` por SQL; para un vendedor Gmail: invitación + `/registro/vendedor`. Las cuentas demo no se versionan.
- Las reseñas y los favoritos siguen exigiendo correo institucional: el demo Gmail sirve para login, panel y admin; reseña y favorito se prueban con una cuenta `@uptc.edu.co`.
- El mapa usa MapTiler si la clave está configurada. Si el dominio no está permitido (preview) o el estilo falla, cae automáticamente a OpenStreetMap. No se cambia el SMTP ni el flujo PKCE.
- En Preview, `/auth/callback` redirige al host del deployment (`VERCEL_URL`) para no perder la cookie de sesión; en Production sigue usando `NEXT_PUBLIC_SITE_URL`.
- Preview del demo: el deployment de Preview actual (protegido por Vercel Authentication). El comodín de redirects de Supabase Auth permite que los magic links vuelvan a ese host.
- Las reseñas y los favoritos siguen exigiendo correo institucional: el demo Gmail sirve para login, panel y admin; reseña y favorito se prueban con una cuenta `@uptc.edu.co`.

## Fotos demo

Las fotos viven en `public/demo` y se subieron al bucket remoto con el script local:

```bash
node --env-file=.env.remote.local scripts/upload-demo-photos.mjs --dry-run
node --env-file=.env.remote.local scripts/upload-demo-photos.mjs
```

El script lee `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, no imprime secretos, es idempotente y aborta en CI/producción. `.env.remote.local` no se versiona. No se ejecuta en Vercel.

## Smoke de producción

| Prueba | Resultado |
|---|---|
| Home, `/buscar`, ficha de local y ficha de producto | 200 y datos remotos |
| Snapshot público | 7 locales, 23 productos disponibles |
| Búsqueda “arepa” | 2 locales, 4 productos |
| Mapa | peticiones a `api.maptiler.com`, sin fallback OSM |
| Upstash | el rate limit creó `saboru:search:*` |
| OG de local y producto | 200, `image/png`, 1200×630 |
| Manifest y `sw.js` | 200 |
| Offline | `/buscar` cae en `/offline` con el service worker activo |
| 404 y `/requiere-conexion` | con marca y sin datos de sesión |
| `/api/e2e/sw-test` | 404 |
| Cabeceras | `nosniff`, `DENY`, CSP report-only y HSTS en producción |
| RLS anónima | `profiles`, `reviews` y escritura de favoritos rechazadas (401) |
| Brevo | envío SMTP de prueba aceptado |

La suite E2E completa se ejecutó antes del deploy contra `build` + `start`: 109 pasaron y 1 se omitió intencionalmente (sheet móvil en Chromium). No se ejecutó la suite autenticada completa contra la URL de Vercel; el magic link se valida en bandeja.

## Seguridad revisada

- RLS y permisos por columna en todas las tablas; sin `using (true)`.
- RPC de vendedor solo con agregados y verificación de `owner_id`; RPC de admin con `is_admin()`.
- `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor y en Vercel como secreto.
- El service worker no cachea `/panel`, `/admin`, `/auth`, Supabase ni métodos distintos de GET.
- Sin `RATE_LIMIT_DISABLED` ni `E2E_SW_TEST` en producción.
- Fotos servidas desde Storage con rutas públicas; sin datos personales.
- La CSP sigue en modo report-only hasta revisar los reportes de MapLibre/Next.

## Operación

- Nuevo deploy: `git push origin master`. Vercel construye desde GitHub.
- Rollback: promover un deployment anterior desde Vercel o revertir el commit en Git.
- Si Supabase Free se pausa, despertarlo el día anterior a una demo.
- Si se resetea Supabase, volver a ejecutar migraciones, seed y `upload-demo-photos` en local.
- Si cambia el dominio, actualizar `NEXT_PUBLIC_SITE_URL`, las redirect URLs de Supabase y los orígenes permitidos de la key de MapTiler.

## Riesgos conocidos

- El remitente SMTP es Gmail, no `@uptc.edu.co`; para usar el dominio institucional hay que autenticarlo por DNS.
- Supabase Free puede pausarse por inactividad.
- Upstash está en `us-west-1`; añade latencia menor a los rate limits.
- El build de Vercel puede fallar de forma transitoria al descargar Google Fonts con `next/font`; reintentar el deployment.
- Sin dominio propio, la URL depende de Vercel y del alias del proyecto.
- La entrega del magic link al buzón institucional debe confirmarse manualmente tras el primer envío con SMTP propio.
