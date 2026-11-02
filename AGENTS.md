# AGENTS.md — SaborU

## Qué es este proyecto

SaborU es una PWA **offline-first** para que la comunidad universitaria (UPTC) descubra, compare y califique la comida del campus por presupuesto, cercanía y criterios de calidad. Tiene tres roles: estudiante, vendedor y admin.

Documentos de referencia (léelos **solo** el de la fase en la que trabajas, no todos a la vez):

- `docs/01-ALCANCE-MVP.md` — qué entra y qué no.
- `docs/02-PLAN-MVP.md` — fases, commits y pruebas.
- `docs/03-ARQUITECTURA-Y-DATOS.md` — stack, modelo de datos, RLS y funciones SQL.
- `docs/04-OFFLINE-PWA.md` — service worker, snapshot local, cola de envío (outbox) y pruebas offline.
- `docs/05-MARCA-Y-UI.md` — logo Pin-U, paleta, tipografías, lema, tokens y assets de `docs/brand/`.

Si hay conflicto entre documentos, gana este orden: `AGENTS.md` > `03` > `04` > `05` > `02` > `01`. Si algo no está definido, **pregunta; no inventes**.

## Protocolo de trabajo (obligatorio)

1. Lee la sección de la fase actual en `docs/02-PLAN-MVP.md` y los documentos que cite.
2. Responde con un plan de máximo 10 líneas: archivos que tocarás, qué probarás y qué NO harás. **Espera aprobación** antes de escribir código.
3. Implementa **un solo paso pequeño** (una migración, una función, una pantalla). No adelantes trabajo de fases futuras.
4. Escribe o actualiza las pruebas junto con el código.
5. Ejecuta las verificaciones (abajo) y **pega el resultado real**. Nunca digas que algo "pasa" si no lo ejecutaste.
6. Un commit por paso, con conventional commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
7. Si algo se rompe, revierte el commit en lugar de acumular parches.
8. Cierra cada tarea con un reporte corto: qué hiciste, qué verificaste, qué **no** pudiste verificar y qué riesgos quedan.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript estricto.
- Tailwind CSS + shadcn/ui.
- Supabase: Postgres 15, PostGIS, Auth, Storage y RLS.
- Serwist (`@serwist/next` + `serwist`) para el service worker; `idb` para IndexedDB.
- Zod + React Hook Form.
- MapLibre GL + OpenStreetMap (solo con conexión).
- Upstash Ratelimit (límite de peticiones en servidor).
- Vitest + Testing Library + `fake-indexeddb` + Playwright.
- Vercel + Supabase Cloud.

Antes de usar la API de Serwist, MapLibre, Supabase o Next.js, **consulta la documentación vigente**: sus APIs cambian entre versiones y tu memoria puede estar desactualizada. Fija versiones exactas en `package.json`.

## Herramientas del agente

- **Base de datos:** para migraciones, tablas, RLS, permisos por columna, triggers, vistas o RPC, carga y sigue la skill `saboru-db`.
- **Marca:** antes de crear o rediseñar UI, lee `docs/05-MARCA-Y-UI.md` y usa los assets de `docs/brand/`. No inventes colores, tipografías ni variantes del logo.
- **Diseño de interfaz:** antes de crear o rediseñar una pantalla, carga y sigue la skill `frontend-design`. Úsala para decidir paleta, tipografía, layout y jerarquía visual; el brief de SaborU y `docs/01` mandan sobre los defaults de la skill.
- **Verificación en navegador:** usa el MCP `playwright` para abrir la app, inspeccionar el DOM, tomar capturas y reproducir flujos a mano. Es para explorar y depurar, no para declarar que una prueba pasa.
- **Pruebas E2E:** la suite automatizada usa `@playwright/test` y se ejecuta con `npm run test:e2e` sobre `build` + `start`. El MCP no reemplaza la suite ni sus resultados.
- **Documentación:** si una API de Next.js, Supabase, Serwist o MapLibre no está clara, consulta la documentación vigente antes de escribir código; no confíes en memoria.

## Comandos

```bash
npm run dev                # desarrollo (el service worker está DESACTIVADO aquí)
npm run build              # build de producción
npm run start              # servidor de producción (aquí se prueba el offline)
npm run lint               # ESLint
npm run typecheck          # tsc --noEmit
npm run test               # Vitest (unitarias)
npm run test:integration   # Vitest contra Supabase local (RLS, RPC, triggers)
npm run test:e2e           # Playwright sobre el build de producción
npm run test:e2e:ui        # Playwright en modo UI

npx supabase start         # Supabase local
npx supabase stop
npx supabase db reset      # reinicia y aplica migraciones + seed
npx supabase migration new <nombre>
npx supabase db push       # aplica migraciones al remoto (pide confirmación)
npx supabase gen types typescript --local > src/types/database.ts
```

Verificación estándar antes de cada commit:

```bash
npm run lint && npm run typecheck && npm run test
```

Si el cambio toca SQL, RLS, auth o RPC, añade `npm run test:integration`. Si toca flujos de usuario o el service worker, añade el E2E correspondiente.

## Reglas no negociables

1. **Alcance:** no implementar pagos, domicilios, chat, notificaciones push, app nativa ni multiuniversidad sin aprobación explícita. El offline sí está en el alcance (ver `docs/04`).
2. **RLS primero:** toda tabla nueva nace con `enable row level security` y sus políticas. Nunca desactivar RLS para "probar". Nunca políticas `using (true)` ni `with check (true)`.
3. **Permisos por columna:** nunca conceder `UPDATE` a nivel de tabla al rol `authenticated` en tablas con columnas sensibles (`role`, `email`, `status`, `plan`, `owner_id`, `slug`). Se usan `revoke` + `grant update (columnas)`. Una política RLS **no** restringe columnas.
4. **Service role:** `SUPABASE_SERVICE_ROLE_KEY` solo se usa en `src/lib/supabase/admin.ts`, importado únicamente desde código de servidor (server actions, route handlers y scripts). Nunca en componentes de cliente, en el service worker ni con prefijo `NEXT_PUBLIC_`.
5. **Validación:** toda entrada del usuario se valida con Zod en el servidor. No usar `any`.
6. **Privacidad del vendedor:** el vendedor **no** tiene `SELECT` directo sobre `reviews`, `search_events` ni `product_views`. Solo consulta funciones RPC que devuelven agregados anónimos (ver `docs/03`).
7. **Precios:** enteros en pesos colombianos (COP). No usar floats para dinero.
8. **Fechas:** guardar en UTC y mostrar en `America/Bogota`. El servidor nunca confía en la hora que envía el cliente.
9. **Idioma:** código, tablas y variables en inglés; textos de interfaz en español.
10. **Accesibilidad:** móvil primero, contraste suficiente, foco visible y navegación por teclado.
11. **Datos reales:** el seed usa datos ficticios. Nunca correos, teléfonos ni direcciones de personas reales.
12. **Guías académicas:** no leer ni modificar los archivos de la carpeta padre (`GUIA_*.md`, `GUÍA*.md`, `pdf_a_markdown.py`). Son entregables del curso y no forman parte del código.
13. **Offline seguro:** el service worker nunca guarda en caché respuestas autenticadas ni privadas (`/panel`, `/admin`, `/auth`, Supabase Auth/REST, métodos distintos de GET). Al cerrar sesión se borran cachés y datos locales privados. Detalle en `docs/04`.
14. **Secretos:** nada de claves en el cliente ni en git. `.env.local` no se versiona; `.env.example` sí, sin valores.
15. **Marca:** la identidad visual está fijada en `docs/05-MARCA-Y-UI.md`; no inventes colores, tipografías ni variantes del logo.

## Estructura

```
src/app/            rutas y layouts (App Router), sw.ts y manifest.ts
src/components/     UI reutilizable y componentes por dominio
src/lib/            Supabase clients, auth, validaciones, catálogo y offline
src/lib/offline/    IndexedDB, snapshot, outbox, sincronización y limpieza
src/server/         server actions, servicios y consultas
src/types/          tipos generados y de dominio
supabase/           migraciones, seed y funciones SQL
tests/              unit, integration y e2e
docs/               alcance, plan, arquitectura y offline
```

- Mutaciones: server actions o `POST /api/sync` (cola offline). Ambos llaman a los **mismos servicios** en `src/server/services`; no dupliques reglas de negocio.
- Las consultas viven en `src/server/queries`; las acciones, en `src/server/actions`.
- Un componente de cliente no importa `lib/supabase/admin.ts` ni módulos con secretos.
- La búsqueda del catálogo es una **función pura** en `src/lib/catalog/search.ts`, con pruebas unitarias.

## Modelo de datos y roles (resumen)

Tablas: `profiles`, `vendor_invites`, `campus_blocks`, `establishments`, `products`, `reviews`, `review_reports`, `favorites`, `search_events`, `product_views`.

- Estudiante: correo `@uptc.edu.co`, busca, filtra, reseña, reporta y guarda favoritos.
- Vendedor: gestiona su ficha y productos; ve solo agregados de su local vía RPC.
- Admin: modera, aprueba establecimientos, invita vendedores y cambia planes manualmente.

Detalle completo en `docs/03-ARQUITECTURA-Y-DATOS.md`.

## Definition of Done

- [ ] Compila sin errores y sin `any` nuevos.
- [ ] Entradas validadas con Zod en el servidor.
- [ ] RLS, permisos por columna y RPC probados para cada rol afectado (incluido el intento de abuso).
- [ ] Pruebas unitarias y E2E del flujo; si afecta el offline, prueba E2E con red cortada.
- [ ] `lint`, `typecheck` y `test` pasan (y `test:integration` si toca la base).
- [ ] Responsive y accesible en móvil.
- [ ] Sin secretos en cliente ni en git.
- [ ] Documentación actualizada si cambió el modelo o una regla.

## Qué no hacer

- No crear reseñas sin verificar el correo institucional.
- No alterar rankings por pago de plan; lo patrocinado se marca "Destacado".
- No exponer datos personales ni `user_id` en ninguna respuesta al vendedor.
- No usar `service_role` en el navegador ni en el service worker.
- No desactivar RLS ni conceder permisos amplios "para salir del paso".
- No cachear datos privados en el service worker ni en IndexedDB sin asociarlos al usuario y borrarlos al cerrar sesión.
- No probar el offline con `npm run dev`: usa `build` + `start`.
- No inventar funciones fuera del MVP.
- No decir que algo funciona sin haberlo ejecutado.

Antes de cada despliegue se revisa **a mano**: autenticación, RLS, permisos por columna, RPC, manejo de datos, caché del service worker y variables de entorno.
