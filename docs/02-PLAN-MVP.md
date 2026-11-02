# SaborU — Plan de implementación del MVP

> Regla de oro: un paso pequeño a la vez, pruebas después de cada cambio y un commit por paso para poder revertir.
> Cada paso sigue el protocolo de `AGENTS.md`: plan corto → aprobación → implementación → verificación real → commit.

## Paso 0 — Decisiones cerradas (2026-11-02)

Detalle y justificación en `docs/06-DECISIONES-PASO-0.md`:

- [x] Dominio institucional exacto: `@uptc.edu.co`.
- [x] Plan de Supabase: Free, con **PostGIS habilitado en el schema `extensions`**.
- [x] Mínimo de reseñas: **5** por producto y 5 por establecimiento.
- [x] Proveedor de rate limit: **Upstash Ratelimit Free**.
- [x] Teselas del mapa: **MapTiler Free** con atribución y fallback a distancia en texto.
- [x] Nombre legal y dominio: **SaborU S.A.S.** · `saboru.app` (+ `saboru.com.co` defensivo).
- [x] Bloques del campus: **6 bloques aproximados**, validar coordenadas en campo.

La Fase 1 puede empezar por **1.1** (Supabase local + PostGIS en `extensions`).

## Fases

### Fase 0 — Base del proyecto y PWA mínima

- `git init` dentro de `saboru/`.
- Scaffold con Next.js 15 (App Router, TypeScript estricto, Tailwind).
- shadcn/ui, ESLint, Prettier, Vitest, Testing Library y Playwright.
- Estructura de carpetas, `.env.example`, `.gitignore`, `AGENTS.md`, `opencode.json` y scripts de `package.json`.
- **PWA mínima desde ya:** `manifest.ts`, iconos, Serwist instalado con un service worker básico y página `/offline`. Objetivo: detectar problemas de instalabilidad desde el primer día.
- **Marca:** copiar los SVG de `docs/brand/` a `public/brand/`; usar el Pin-U en `manifest.ts`, favicon y pantalla de carga; seguir `docs/05-MARCA-Y-UI.md`.
- Verificar: `lint`, `typecheck`, `test` y `test:e2e` corren; la app es instalable con `build` + `start`.

Commit: `chore: scaffold next.js, tailwind, testing y pwa minima`

### Fase 1 — Datos y seguridad (subpasos)

Un subpaso = una migración + sus pruebas de integración + un commit. Definición exacta en `docs/03`.

- **1.1** Supabase local (`supabase start`), vincular el CLI, habilitar PostGIS. Commit: `chore(db): supabase local y postgis`
- **1.2** `profiles`, enum de roles, funciones `is_admin()` e `is_institutional_student()`, trigger `handle_new_user`, `vendor_invites`, permisos por columna. Pruebas 1, 3 y 4 de abuso. Commit: `feat(db): perfiles, roles, invitaciones y dominio institucional`
- **1.3** `campus_blocks`, `establishments` y `products` con constraints, índice GIST, permisos por columna y RLS. Pruebas 11 y 12 (parte de tablas). Commit: `feat(db): bloques, establecimientos y productos con rls`
- **1.4** `reviews` con FK compuesta, trigger de 30 días, vistas `public_reviews` y `product_stats`. Pruebas 2, 5, 6 y 7. Commit: `feat(db): reseñas, regla de 30 dias y vistas publicas`
- **1.5** `review_reports` y `favorites`. Commit: `feat(db): reportes y favoritos con rls`
- **1.6** `search_events`, `product_views`, RPC de registro anónimo y RPC `search_products`. Commit: `feat(db): analitica anonima y busqueda`
- **1.7** RPC del vendedor (agregados con mínimo de reseñas) y RPC de admin. Pruebas 8, 9, 10, 13 y 14. Commit: `feat(db): rpc de vendedor y admin`
- **1.8** Seed ficticio (5 a 8 establecimientos, 20 a 30 productos, bloques) y generación de tipos. Commit: `feat(db): seed y tipos generados`

Cierre de fase: pasan las 14 pruebas de abuso de `docs/03`.

### Fase 2 — Autenticación y roles

- Supabase Auth con magic link u OTP por correo (probar entrega; si falla, OTP de 6 dígitos).
- Mensaje claro cuando el correo no es institucional (la base lo rechaza de todos modos).
- Invitación de vendedores por admin y aceptación.
- Guards de servidor: `requireUser`, `requireRole('vendor')`, `requireRole('admin')`.
- Pantallas de login, registro y cierre de sesión; redirección por rol.
- Cambio de correo desactivado o con la misma regla de dominio.

Commit: `feat(auth): login institucional, invitaciones y roles`

### Fase 3 — Catálogo y buscador

- Función pura `src/lib/catalog/search.ts` con pruebas (presupuesto, distancia, categoría, abierto ahora, orden).
- Inicio con buscador y establecimientos "Destacados" en sección aparte.
- Listado con filtros combinables y paginación server-side.
- Fichas de establecimiento y producto con `product_stats` y reseñas públicas.
- Registro anónimo de búsquedas y vistas (con rate limit).
- Endpoint `GET /api/catalog/snapshot`.
- Estados vacío, error y carga.

Commit: `feat(catalog): fichas, busqueda y filtros`

### Fase 4 — Reseñas verificadas

- Servicio `createReview` (Zod, mismo código para server action y `/api/sync`).
- Mensajes claros para `review_cooldown` y `product_unavailable`.
- Formulario (solo con sesión), edición dentro de 30 días, insignia "Reseña verificada".
- Reporte de reseñas.
- Rate limit en reseñas y reportes.
- Pruebas unitarias de promedios y ventana de 30 días.

Commit: `feat(reviews): resenas por criterios, verificacion y reportes`

### Fase 5 — Panel del vendedor

- Edición de la ficha propia (solo columnas permitidas) y CRUD de productos.
- Fotos en Supabase Storage con políticas por propietario.
- Estadísticas solo por RPC: promedio por criterio, top consultados, consultas por hora, comentarios anónimos y comparación con el campus.
- Mensaje cuando hay menos reseñas que el mínimo.
- Pruebas de que un vendedor no lee ni edita datos de otro (incluido Storage).

Commit: `feat(vendor): panel de estadisticas y gestion de ficha`

### Fase 6 — Offline robusto

Detalle en `docs/04-OFFLINE-PWA.md`. Subpasos:

- **6.1** Service worker completo: estrategias, lista de exclusión (función pura con pruebas) y actualización controlada. Commit: `feat(pwa): service worker robusto`
- **6.2** IndexedDB, snapshot, indicador "actualizado el…" y búsqueda offline. Commit: `feat(offline): snapshot local y busqueda sin conexion`
- **6.3** Outbox y `POST /api/sync` para reseñas, favoritos y reportes; sincronización en `online`, `visibilitychange` y apertura. Commit: `feat(offline): cola de envio y sincronizacion`
- **6.4** Limpieza al cerrar sesión, pantallas "Requiere conexión" y manejo de cuota. Commit: `feat(offline): limpieza al cerrar sesion y privacidad`
- **6.5** E2E offline (6 pruebas de `docs/04`) y verificación manual en Android (y iPhone si es posible). Commit: `test(offline): e2e sin conexion`

### Fase 7 — Admin y pulido

- Moderación de reseñas reportadas (publicar, ocultar) y resolución de reportes, por RPC.
- Aprobar, suspender y reactivar establecimientos; crear establecimientos y generar invitaciones.
- Cambio manual de plan (`basic`, `featured`, `pro`) sin pagos.
- Accesibilidad (foco, contraste, etiquetas), responsive y estados de error.
- Política de privacidad y consentimiento visibles (Ley 1581 de 2012).
- Revisión de cabeceras de seguridad.

Commit: `feat(admin): moderacion, planes manuales y pulido`

### Fase 8 — Despliegue

- Aplicar migraciones al Supabase remoto (con confirmación manual).
- Desplegar en Vercel con variables de producción (incluidas las de Upstash).
- Dominio y HTTPS.
- Smoke test E2E contra el entorno desplegado, incluido el offline.
- **Revisión manual de seguridad** (auth, RLS, permisos por columna, RPC, caché del SW, variables).
- Documentar en `docs/05-DESPLIEGUE.md` si hace falta.

Commit: `chore: deploy en vercel y smoke test`

## Estrategia de pruebas

### Unitarias (Vitest)

- Promedios por criterio y general.
- `isOpenNow`: horarios normales, cruce de medianoche y día cerrado.
- Búsqueda pura del catálogo y distancia.
- Validaciones Zod (establecimientos, productos, reseñas, operaciones de sync).
- Regla de 30 días y formato de precios COP.
- Outbox, limpieza y lista de exclusión del service worker (con `fake-indexeddb`).

### Integración (Vitest contra Supabase local)

- Las 14 pruebas de abuso de `docs/03`.
- Server actions y `/api/sync` contra la base local.
- Storage: un vendedor no sobrescribe fotos de otro.

### E2E (Playwright, sobre `build` + `start`)

Ocho flujos obligatorios, los mismos criterios de aceptación de `docs/01`:

1. **Estudiante:** registro institucional, búsqueda por presupuesto y cercanía, ficha y reseña.
2. **Correo no institucional:** el registro se rechaza con mensaje claro.
3. **Reseña:** el promedio se actualiza y aparece "Reseña verificada".
4. **Vendedor:** inicia sesión, edita su ficha, crea un producto y ve sus estadísticas.
5. **Admin:** oculta una reseña reportada y desaparece de la ficha pública.
6. **Sin sesión:** navega el catálogo pero no puede reseñar.
7. **Offline, lectura y escritura:** búsqueda y ficha sin red; reseña pendiente que se publica al volver la red.
8. **Offline, privacidad:** al cerrar sesión no quedan datos privados locales.

### Comandos

```bash
npm run lint
npm run typecheck
npm run test              # unitarias
npm run test:integration  # Supabase local
npm run test:e2e          # Playwright sobre build de producción
```

Durante el desarrollo se corre solo el subconjunto del flujo tocado. Antes de cerrar una fase, la suite completa.

## Git

- Un commit por paso pequeño, con conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- No mezclar refactors grandes con funcionalidades.
- Si algo se rompe, se revierte el commit en lugar de acumular parches.
- Nunca `git push` ni `supabase db push` sin confirmación manual (ver `opencode.json`).

## Cómo pedírselo al agente

Un modelo más débil rinde mejor con pasos acotados. Usar siempre el modo Plan primero y pedir un solo subpaso:

> "Fase 1.2. Lee `docs/03` (secciones `profiles` y `vendor_invites`). Propón el plan en máx. 10 líneas. No escribas código hasta que lo apruebe."

Revisar a mano todo lo de RLS, permisos por columna y RPC, y leer las pruebas de abuso: es donde un modelo se equivoca sin avisar.

## Definition of Done

Un paso está terminado cuando:

- [ ] Compila sin errores y sin `any` nuevos.
- [ ] Toda entrada del usuario se valida con Zod en el servidor.
- [ ] RLS, permisos por columna y RPC nuevos se probaron con cada rol afectado, incluido el intento de abuso.
- [ ] Tiene pruebas unitarias y, si es un flujo, E2E; si afecta el offline, E2E con red cortada.
- [ ] `lint`, `typecheck` y `test` pasan (y `test:integration` si toca la base).
- [ ] Funciona en móvil, con contraste y navegación por teclado.
- [ ] No hay secretos en el cliente ni en git.
- [ ] Se actualizó la documentación si cambió el modelo o una regla de negocio.
- [ ] El reporte final dice qué se verificó y qué **no** se pudo verificar.
