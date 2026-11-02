---
name: saboru-db
description: Checklist para crear o cambiar migraciones, tablas, RLS, permisos por columna, triggers, vistas y RPC de SaborU en Supabase/Postgres. Úsala cuando la tarea toque SQL, roles, reseñas, establecimientos, productos, favoritos o analítica.
compatibility: opencode
metadata:
  project: saboru
---

# SaborU — Base de datos y RLS

Esta skill es el checklist de trabajo. La fuente de verdad es `docs/03-ARQUITECTURA-Y-DATOS.md`; si hay conflicto, gana `AGENTS.md`. Lee el doc antes de escribir SQL.

## Cuándo usar esta skill

- Nueva migración o tabla.
- Política RLS, permiso por columna o rol.
- Trigger, vista o función RPC.
- Reglas de reseñas, establecimientos, productos, favoritos o analítica.
- Pruebas de integración o de abuso de la base.

## Reglas que no se negocian

1. Toda tabla nueva nace con `enable row level security` y sus políticas. Nunca `using (true)` ni `with check (true)`.
2. RLS no restringe columnas. Para columnas sensibles (`role`, `email`, `status`, `plan`, `owner_id`, `slug`) usa `revoke` + `grant update (columnas)`. Nunca `grant update` a nivel de tabla.
3. `service_role` solo en `src/lib/supabase/admin.ts` o en scripts de servidor. Nunca en cliente, service worker ni con prefijo `NEXT_PUBLIC_`.
4. Funciones `security definer`: `set search_path = ''`, nombres calificados (`public.tabla`) y `revoke execute ... from public, anon` salvo las que deban ser públicas.
5. El correo institucional se valida contra `auth.users` con `is_institutional_student()`, no contra `profiles.email`.
6. La hora y el estado de una reseña los pone el servidor (`now()`); no confíes en fechas del cliente.
7. Reseñas: una por usuario y producto cada 30 días, con `pg_advisory_xact_lock` para envíos simultáneos. Cuenta también las reseñas ocultas.
8. El vendedor no tiene `SELECT` directo sobre `reviews`, `review_reports`, `search_events` ni `product_views`. Solo RPC de agregados y con mínimo de reseñas.
9. `plan` nunca altera promedios ni el `order by`. Lo patrocinado se muestra aparte y marcado "Destacado".
10. FK compuesta `(product_id, establishment_id)` para que una reseña no apunte a un producto de otro local.
11. Analítica sin `user_id` ni identificadores de dispositivo.
12. Cada cambio de SQL se prueba por rol, incluido el intento de abuso.

## Flujo para una migración

1. `npx supabase migration new <nombre>`.
2. Escribe la migración en este orden: extensión e índices → tabla → constraints → `revoke`/`grant` → `enable row level security` → políticas → funciones/triggers/vistas → grants de ejecución.
3. `npx supabase db reset`.
4. `npx supabase gen types typescript --local > src/types/database.ts`.
5. Añade pruebas en `tests/integration` (caso feliz y caso de abuso).
6. `npm run test:integration`.
7. Commit `feat(db): ...` o `fix(db): ...`.

## Checklist de una política RLS

- [ ] `enable row level security` en la tabla.
- [ ] Políticas de `select`, `insert`, `update` y `delete` solo para los roles necesarios.
- [ ] `using` y `with check` verifican `auth.uid()` o `is_admin()`.
- [ ] Los permisos por columna están separados de la política.
- [ ] "Usuario A intenta tocar datos de B" está probado y falla.
- [ ] "`anon` intenta leer o escribir" está probado y falla.
- [ ] "El vendedor intenta cambiar `plan`, `status` o `owner_id`" está probado y falla.

## Matriz rápida

| Tabla / objeto | Anónimo | Estudiante | Vendedor | Admin |
|---|---|---|---|---|
| `establishments` | SELECT si `active` | SELECT activos | SELECT el propio; UPDATE de columnas permitidas | SELECT todo; cambios por RPC |
| `products` | SELECT si disponible y local activo | igual | CRUD del propio local | SELECT todo |
| `reviews` | — | INSERT propio; UPDATE de rating/comentario propio dentro de 30 días; SELECT propio | Sin acceso | SELECT todo; estado por RPC |
| `public_reviews`, `product_stats` | SELECT | SELECT | SELECT | SELECT |
| `review_reports` | — | INSERT y SELECT propios | Sin acceso | SELECT todo; estado por RPC |
| `favorites` | — | CRUD propio | — | — |
| `profiles` | — | SELECT propio; UPDATE solo `full_name` | igual | SELECT todo; rol por SQL manual |
| `vendor_invites` | — | — | — | Todo vía RPC/RLS admin |
| `search_events`, `product_views` | Solo vía RPC de registro | Solo vía RPC de registro | Solo RPC de agregados | Solo RPC |
| `campus_blocks` | SELECT | SELECT | SELECT | Todo |

## Errores típicos

- Creer que una política `for update` limita columnas. No lo hace.
- Dar `UPDATE` de tabla a `authenticated` y luego confiar en la política.
- Usar `profiles.email` como fuente de verdad del dominio.
- Recalcular `created_at` en un `BEFORE UPDATE` y romper la ventana de 30 días.
- Devolver `user_id` en una vista o RPC del vendedor.
- Mezclar patrocinados en el ranking o usar `plan` en el `order by`.
- Encolar o cachear datos privados sin asociarlos al `user_id`.

## Pruebas de abuso

Las 14 pruebas obligatorias están en `docs/03-ARQUITECTURA-Y-DATOS.md`. Si tu cambio toca una tabla, ejecuta las que apliquen y añade una nueva si abres un camino que no estaba cubierto.
