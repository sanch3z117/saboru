# SaborU — Arquitectura y datos

> Fuente de verdad técnica. Si algo contradice a `AGENTS.md`, gana `AGENTS.md`. El offline se detalla en `docs/04-OFFLINE-PWA.md`.

## Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript estricto | Un código para móvil y escritorio, SSR y server actions |
| Estilos | Tailwind CSS + shadcn/ui | Rapidez y accesibilidad |
| Base de datos | Supabase (Postgres 15) + PostGIS | Relacional, cercanía geográfica, RLS |
| Autenticación | Supabase Auth | Magic link/OTP y sesiones seguras |
| Archivos | Supabase Storage | Fotos de establecimientos y productos |
| PWA / offline | Serwist (`@serwist/next`, `serwist`) + `idb` | Service worker robusto e IndexedDB |
| Mapas | MapLibre GL + MapTiler (teselas) | Solo con conexión; MapTiler Free con atribución y fallback a distancia en texto |
| Validación | Zod + React Hook Form | Reglas compartidas cliente/servidor |
| Límite de peticiones | Upstash Ratelimit (plan gratuito) | Rate limiting en Vercel |
| Pruebas | Vitest + Testing Library + `fake-indexeddb` + Playwright | Unitarias, integración y E2E |
| Hosting | Vercel + Supabase Cloud | Despliegue simple |

Sin ORM: cliente de Supabase con tipos generados (`supabase gen types`). Fijar versiones exactas en `package.json`.

**PostGIS:** se instala en el schema `extensions`, no en `public`. En migraciones, tipos y RPC usa `extensions.geography`, `extensions.st_point`, `extensions.st_distance` y `extensions.st_dwithin`; las funciones `security definer` con `search_path = ''` deben calificar el schema.

## Estructura de carpetas

```
saboru/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── buscar/page.tsx
│   │   │   ├── establecimiento/[slug]/page.tsx
│   │   │   ├── producto/[id]/page.tsx
│   │   │   └── offline/page.tsx          # pantalla de respaldo sin conexión
│   │   ├── (auth)/login, registro
│   │   ├── (vendor)/panel/               # ficha, productos, estadisticas
│   │   ├── (admin)/admin/                # resenas, establecimientos, invitaciones
│   │   ├── api/
│   │   │   ├── sync/route.ts             # POST: cola de envío offline
│   │   │   └── catalog/snapshot/route.ts # GET: copia pública del catálogo
│   │   ├── sw.ts                         # service worker (Serwist)
│   │   ├── manifest.ts
│   │   └── layout.tsx
│   ├── components/ (ui, catalog, reviews, vendor, offline)
│   ├── lib/
│   │   ├── supabase/ (server.ts, browser.ts, admin.ts)
│   │   ├── auth/ (guards.ts, roles.ts)
│   │   ├── validations/ (establishment, product, review, sync)
│   │   ├── catalog/search.ts             # búsqueda pura, compartida online/offline
│   │   ├── offline/                      # db, snapshot, outbox, sync, cleanup
│   │   └── utils/ (price.ts, schedule.ts, distance.ts, ratelimit.ts)
│   ├── server/
│   │   ├── actions/
│   │   ├── services/                     # reglas de negocio únicas
│   │   └── queries/
│   └── types/ (database.ts generado, domain.ts)
├── supabase/ (migrations/, seed.sql)
├── tests/ (unit, integration, e2e)
├── public/ (iconos, imagen de reemplazo)
├── docs/
├── .env.example
└── AGENTS.md
```

## Principios de seguridad de datos

1. **RLS no restringe columnas.** Para columnas sensibles se usa `revoke` + `grant update (columnas)`.
2. **El vendedor nunca lee tablas con datos de usuarios.** Solo RPC de agregados.
3. **Las acciones de admin sobre columnas sensibles** (`role`, `status`, `plan`, `owner_id`) se hacen por RPC `security definer` que verifica `is_admin()`. No se concede `UPDATE` de esas columnas a `authenticated`.
4. **Toda función `security definer`** lleva `set search_path = ''`, nombres calificados (`public.tabla`) y `revoke execute ... from public, anon` salvo las que deban ser públicas.
5. **El correo institucional se verifica contra `auth.users`**, nunca contra una copia editable.
6. **La hora la pone el servidor** (`now()`); se ignora cualquier fecha del cliente.

## Modelo de datos

### `profiles`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | FK `auth.users.id` on delete cascade |
| `role` | enum `student \| vendor \| admin` | Lo fija el trigger; no editable por el usuario |
| `full_name` | text | Único campo editable por el usuario |
| `email` | text unique | Copia informativa en minúsculas; **no** es fuente de verdad |
| `created_at` | timestamptz | |

```sql
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "own profile select" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
```

Sin `INSERT` ni `DELETE` para clientes: el perfil lo crea el trigger.

### `vendor_invites`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | Se compara en minúsculas |
| `establishment_id` | uuid | FK; el local que gestionará |
| `invited_by` | uuid | FK `profiles.id` (admin) |
| `expires_at` | timestamptz | Por defecto 7 días |
| `accepted_at` / `accepted_by` | timestamptz / uuid | Nulos hasta aceptar |
| `created_at` | timestamptz | |

RLS: solo admin (`is_admin()`) para SELECT/INSERT/UPDATE. Un vendedor no la ve.

`vendor_invites.establishment_id` es `uuid NOT NULL` **sin FK** en 1.2 porque `establishments` se crea en 1.3.

**Pendiente para 1.3:** agregar la FK `establishment_id → public.establishments (id)`, backfillear `establishments.owner_id` desde las invitaciones aceptadas (`accepted_by`) y probar que un `establishment_id` inexistente falla después de la FK.

### Funciones y trigger de registro

```sql
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function public.is_institutional_student() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid()
      and p.role = 'student'
      and u.email_confirmed_at is not null
      and lower(u.email) like '%@uptc.edu.co'
  );
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(new.email);
  v_invite public.vendor_invites%rowtype;
begin
  select * into v_invite from public.vendor_invites
   where lower(email) = v_email and accepted_at is null and expires_at > now()
   limit 1;

  if found then
    insert into public.profiles (id, role, email, full_name)
    values (new.id, 'vendor', v_email, coalesce(new.raw_user_meta_data->>'full_name', ''));
    update public.vendor_invites set accepted_at = now(), accepted_by = new.id where id = v_invite.id;
    update public.establishments set owner_id = new.id where id = v_invite.establishment_id;
  elsif v_email like '%@uptc.edu.co' then
    insert into public.profiles (id, role, email, full_name)
    values (new.id, 'student', v_email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  else
    raise exception 'email_domain_not_allowed' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
```

- Si el trigger lanza error, el registro se revierte: no queda cuenta ni perfil.
- Alternativa más limpia: un *Before User Created hook* de Supabase Auth con la misma lógica. Verificar en la documentación vigente cuál está disponible en el plan.
- **Cambio de correo:** desactivar el cambio de email en Auth o aplicar la misma regla; `is_institutional_student()` lee `auth.users` en cada llamada, por lo que un cambio a un dominio ajeno bloquea las reseñas.
- **Admin:** se asigna manualmente en la base (`update profiles set role='admin'` con `service_role` o SQL editor). No hay registro público de admin.

### `campus_blocks`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Ej. "Bloque A", "Cafetería central" |
| `location` | extensions.geography(Point, 4326) | |

### `establishments`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `owner_id` | uuid null | FK `profiles.id`; se asigna al aceptar la invitación |
| `name` / `slug` | text | `slug` único, lo crea el admin |
| `description`, `address` | text | |
| `location` | extensions.geography(Point, 4326) | Índice GIST |
| `schedule` | jsonb | Formato abajo; validado con Zod |
| `category` | text | |
| `photos` | text[] | Rutas de Storage |
| `status` | enum `draft \| pending \| active \| suspended` | Solo admin |
| `plan` | enum `basic \| featured \| pro` | Solo admin |
| `created_at` / `updated_at` | timestamptz | |

Permisos de columna para el vendedor (dueño):

```sql
revoke all on public.establishments from anon, authenticated;
grant select on public.establishments to anon, authenticated;
grant update (name, description, address, location, schedule, category, photos)
  on public.establishments to authenticated;
```

`slug`, `status`, `plan` y `owner_id` solo cambian por RPC de admin. El **vendedor no crea establecimientos**: los crea el admin y los asigna por invitación.

```json
{
  "mon": [["07:00", "17:00"]], "tue": [["07:00", "17:00"]],
  "wed": [["07:00", "17:00"]], "thu": [["07:00", "17:00"]],
  "fri": [["07:00", "16:00"]], "sat": [], "sun": []
}
```

Hora local `America/Bogota`. Un cierre menor que la apertura (ej. `["18:00","02:00"]`) significa cruce de medianoche.

### `products`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `establishment_id` | uuid | FK |
| `name`, `description` | text | |
| `price_cop` | integer | `check (price_cop > 0)` |
| `category` | text | |
| `photo_url` | text | |
| `available` | boolean | |
| `allergens` | text[] | |
| `created_at` / `updated_at` | timestamptz | |

`unique (id, establishment_id)` para la FK compuesta de `reviews`. El vendedor puede `INSERT` (la política verifica que `establishment_id` sea de su propiedad) y `UPDATE` de todas las columnas **menos** `id` y `establishment_id`.

### `reviews`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `client_id` | uuid | Identificador de la cola offline; `unique (user_id, client_id)` |
| `user_id` | uuid | FK `profiles.id` |
| `product_id`, `establishment_id` | uuid | **FK compuesta** `(product_id, establishment_id)` → `products (id, establishment_id)` |
| `rating_sabor`, `rating_cantidad`, `rating_precio`, `rating_presentacion`, `rating_calidad_precio` | smallint | `check between 1 and 5` |
| `comment` | text | Opcional, máx. 500 caracteres |
| `status` | enum `published \| pending \| hidden` | Lo fija el trigger; solo admin lo cambia |
| `created_at` | timestamptz | Lo fija el trigger |

La FK compuesta impide que una reseña apunte a un producto de otro establecimiento.

```sql
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to authenticated;
grant insert (client_id, user_id, product_id, establishment_id,
  rating_sabor, rating_cantidad, rating_precio, rating_presentacion,
  rating_calidad_precio, comment) on public.reviews to authenticated;
grant update (rating_sabor, rating_cantidad, rating_precio, rating_presentacion,
  rating_calidad_precio, comment) on public.reviews to authenticated;
-- Sin DELETE para clientes: borrar y reinsertar saltaría la regla de 30 días.

create policy "students insert own reviews" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_institutional_student());

create policy "students edit own recent reviews" on public.reviews
  for update to authenticated
  using (user_id = auth.uid() and status = 'published'
         and created_at > now() - interval '30 days'
         and public.is_institutional_student())
  with check (user_id = auth.uid());

create policy "read own or admin reviews" on public.reviews
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
```

**Trigger `BEFORE INSERT`** (regla de 30 días, estado y hora del servidor):

```sql
create function public.enforce_review_rules() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || new.product_id::text, 0));

  if not exists (
    select 1 from public.products p
    join public.establishments e on e.id = p.establishment_id
    where p.id = new.product_id and p.available and e.status = 'active'
  ) then
    raise exception 'product_unavailable' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.reviews r
    where r.user_id = new.user_id and r.product_id = new.product_id
      and r.created_at > now() - interval '30 days'
  ) then
    raise exception 'review_cooldown' using errcode = 'P0001';
  end if;

  new.created_at := now();
  new.status := 'published';
  return new;
end $$;

create trigger reviews_enforce before insert on public.reviews
for each row execute function public.enforce_review_rules();
```

El bloqueo (`advisory lock`) evita que dos envíos simultáneos salten la regla. Cuenta reseñas en cualquier estado (también ocultas).

**Vistas públicas sin `user_id`** (corren con los privilegios del dueño y exponen solo lo seguro):

```sql
create view public.public_reviews as
  select r.id, r.product_id, r.establishment_id, r.rating_sabor, r.rating_cantidad,
         r.rating_precio, r.rating_presentacion, r.rating_calidad_precio,
         r.comment, r.created_at
  from public.reviews r
  join public.establishments e on e.id = r.establishment_id and e.status = 'active'
  where r.status = 'published';

create view public.product_stats as
  select product_id, count(*)::int as review_count,
         round(avg(rating_sabor), 2) as avg_sabor,
         round(avg(rating_cantidad), 2) as avg_cantidad,
         round(avg(rating_precio), 2) as avg_precio,
         round(avg(rating_presentacion), 2) as avg_presentacion,
         round(avg(rating_calidad_precio), 2) as avg_calidad_precio
  from public.public_reviews group by product_id;

grant select on public.public_reviews, public.product_stats to anon, authenticated;
```

Toda reseña publicada muestra la insignia "Reseña verificada" porque el trigger y la política solo permiten estudiantes institucionales.

### `review_reports`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `client_id` | uuid | Idempotencia offline |
| `review_id` | uuid | FK |
| `reporter_id` | uuid | FK `profiles.id` |
| `reason` | text | Máx. 300 caracteres |
| `status` | enum `open \| reviewed \| dismissed` | Solo admin lo cambia (RPC) |
| `created_at` | timestamptz | |

`unique (review_id, reporter_id)`. Estudiante: `INSERT` propio (solo `review_id`, `reason`, `client_id`) y `SELECT` propio. **El vendedor no ve reportes** (`reporter_id` es dato personal). Admin: todo vía `is_admin()` y RPC.

### `favorites`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK `profiles.id` |
| `establishment_id` | uuid | FK |
| `product_id` | uuid null | FK |
| `created_at` | timestamptz | |

```sql
create unique index favorites_unique on public.favorites
  (user_id, establishment_id, coalesce(product_id, '00000000-0000-0000-0000-000000000000'));
```

Estudiante: CRUD solo de las propias (`user_id = auth.uid()`). Nadie más.

### `search_events` y `product_views` (analítica anónima)

Sin `user_id` ni identificadores de dispositivo.

- `search_events`: `id`, `budget` (null), `block_id` (null), `category` (null), `created_at`.
- `product_views`: `id`, `product_id`, `created_at`.

Sin acceso directo para ningún rol. Se escriben con RPC públicas que validan la entrada:

```sql
create function public.log_product_view(p_product_id uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.product_views (product_id)
  select p.id from public.products p
  join public.establishments e on e.id = p.establishment_id
  where p.id = p_product_id and e.status = 'active';
$$;
grant execute on function public.log_product_view(uuid) to anon, authenticated;
```

Se llaman desde el servidor con rate limit. **No se encolan offline.**

## RPC del vendedor (únicas lecturas de estadísticas)

Todas verifican que el llamante sea dueño del establecimiento, devuelven agregados y **suprimen resultados con menos de N reseñas** (`public.min_reviews_for_stats()`, por defecto 5, confirmado en `docs/06-DECISIONES-PASO-0.md`).

```sql
create function public.vendor_product_stats(p_establishment_id uuid)
returns table (product_id uuid, review_count int, avg_sabor numeric, avg_cantidad numeric,
               avg_precio numeric, avg_presentacion numeric, avg_calidad_precio numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.establishments e
                 where e.id = p_establishment_id and e.owner_id = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select r.product_id, count(*)::int,
           round(avg(r.rating_sabor), 2), round(avg(r.rating_cantidad), 2),
           round(avg(r.rating_precio), 2), round(avg(r.rating_presentacion), 2),
           round(avg(r.rating_calidad_precio), 2)
    from public.reviews r
    where r.establishment_id = p_establishment_id and r.status = 'published'
    group by r.product_id
    having count(*) >= public.min_reviews_for_stats();
end $$;
revoke execute on function public.vendor_product_stats(uuid) from public, anon;
grant execute on function public.vendor_product_stats(uuid) to authenticated;
```

Mismo patrón para:

- `vendor_top_products(p_establishment_id)`: productos más consultados (de `product_views`).
- `vendor_views_by_hour(p_establishment_id)`: consultas por hora (`America/Bogota`).
- `vendor_campus_comparison(p_establishment_id)`: promedio del local vs. promedio del campus.
- `vendor_recent_comments(p_establishment_id)`: comentarios recientes **sin autor ni id de usuario**, solo si el local supera el mínimo de reseñas.

## RPC de admin (`security definer`, verifican `is_admin()`)

`admin_set_review_status(review_id, status)`, `admin_resolve_report(report_id, status)`, `admin_set_establishment_status(id, status)`, `admin_set_establishment_plan(id, plan)`, `admin_create_vendor_invite(email, establishment_id)`. Cambiar `plan` **no** altera promedios ni orden.

## Matriz RLS y permisos (resumen)

| Tabla / objeto | Anónimo | Estudiante | Vendedor | Admin |
|---|---|---|---|---|
| `establishments` | SELECT si `active` | SELECT activos | SELECT activos y el propio; UPDATE de columnas permitidas del propio | SELECT todo; cambios por RPC |
| `products` | SELECT si disponible y local activo | igual | CRUD del propio local | SELECT todo |
| `reviews` (tabla) | — | INSERT propio; UPDATE de rating/comentario propio dentro de 30 días; SELECT propio | **Sin acceso** | SELECT todo; estado por RPC |
| `public_reviews`, `product_stats` | SELECT | SELECT | SELECT | SELECT |
| `review_reports` | — | INSERT y SELECT propios | **Sin acceso** | SELECT todo; estado por RPC |
| `favorites` | — | CRUD propio | — | — |
| `profiles` | — | SELECT propio; UPDATE solo `full_name` | igual | SELECT todo; rol por SQL manual |
| `vendor_invites` | — | — | — | Todo vía RPC/RLS admin |
| `search_events`, `product_views` | — (solo vía RPC de registro) | — | — (solo vía RPC de agregados) | — (solo vía RPC) |
| `campus_blocks` | SELECT | SELECT | SELECT | Todo |

Regla: ninguna tabla nueva sin `enable row level security` y sus políticas. Nunca `using (true)` ni `with check (true)`.

## Storage

- Bucket `establishment-photos`: lectura pública; escritura solo en la ruta `{establishment_id}/...` si el usuario es dueño de ese establecimiento (política sobre `storage.objects`).
- Nombres de archivo con UUID aleatorio, tipos permitidos jpeg/png/webp y tamaño máximo (5 MB, por confirmar).
- Un vendedor no puede escribir, sobrescribir ni borrar fotos de otro local.

## Búsqueda del catálogo

- **Fuente única de lógica:** `src/lib/catalog/search.ts` (función pura) aplica presupuesto, distancia a un bloque, categoría, abierto ahora y orden. La usa la UI online (sobre datos del servidor) y offline (sobre el snapshot local).
- **Online:** RPC `search_products(p_budget, p_block_id, p_radius_m, p_category)` devuelve candidatos; "abierto ahora" y paginación se aplican en el servidor sobre ese conjunto (el catálogo es pequeño: ≤ unos cientos de productos).

```sql
select p.*, e.name as establishment_name,
       extensions.st_distance(e.location, b.location) as distance_m
from public.products p
join public.establishments e on e.id = p.establishment_id
join public.campus_blocks b on b.id = $1
where e.status = 'active' and p.available
  and p.price_cop <= $2
  and extensions.st_dwithin(e.location, b.location, $3)
  and ($4::text is null or p.category = $4)
order by distance_m asc, p.price_cop asc;
```

- El **plan nunca entra en el `order by`**. Lo patrocinado se muestra en una sección aparte marcada "Destacado".
- Hora siempre en `America/Bogota`, calculada en el servidor (online) o con el reloj del dispositivo ajustado a esa zona (offline; solo para mostrar, nunca para reglas de negocio).
- Prueba obligatoria: la función pura y el RPC dan el mismo resultado con los mismos datos.

## Snapshot y sincronización

- `GET /api/catalog/snapshot`: devuelve solo datos públicos (establecimientos activos, productos disponibles, bloques, `product_stats`, reseñas publicadas recientes sin `user_id`) con `version` y `generated_at`. Sin cookies ni datos privados; cacheable.
- `POST /api/sync`: recibe un lote (máx. 20) de operaciones `{ client_id, type: 'review' | 'favorite' | 'report', payload }`. Requiere sesión, valida con Zod, aplica rate limit y llama a los **mismos servicios** que las server actions. Responde por operación: `ok`, `duplicate` (mismo `client_id`, se trata como éxito) o `rejected` con código (`review_cooldown`, `product_unavailable`, `invalid`, `forbidden`). Las rechazadas no se reintentan.
- La hora y el estado los decide el servidor.

## Autenticación y roles

- Estudiante: magic link/OTP; el dominio se rechaza en la base (trigger) y también antes en la UI para dar un mensaje claro.
- Vendedor: solo por invitación de admin (`vendor_invites`); se asocia al establecimiento al aceptar.
- Admin: asignación manual.
- Guards de servidor: `requireUser()`, `requireRole('vendor')`, `requireRole('admin')`. La UI oculta acciones, pero la seguridad real es RLS + permisos de columna + RPC.
- Tras el login, redirección por rol. Al cerrar sesión se limpian cachés y datos locales privados (ver `docs/04`).

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # nunca NEXT_PUBLIC_, solo servidor
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

`.env.local` no se versiona; `.env.example` sí, sin valores.

## Seguridad y privacidad

- RLS activa y probada en todas las tablas; permisos por columna donde aplique.
- Zod en cada server action y route handler. Sin `any`.
- Rate limit con Upstash, por usuario e IP: reseñas (p. ej. 10/hora), reportes (p. ej. 20/hora), `/api/sync`, registro de vistas y búsquedas. Valores iniciales ajustables.
- Comentarios de reseñas: texto plano, sin HTML, longitud máxima; moderación por reportes.
- Cabeceras de seguridad (CSP, `X-Content-Type-Options`, `Referrer-Policy`), HTTPS, cookies `SameSite=Lax` y `Secure`.
- Sin datos personales en analítica. Política de privacidad y consentimiento visibles (Ley 1581 de 2012).
- El service worker nunca guarda respuestas autenticadas (regla 13 de `AGENTS.md`).
- Revisión manual antes de cada despliegue: auth, RLS, permisos por columna, RPC, caché del SW y variables de entorno.

## Pruebas de integración obligatorias (abuso incluido)

1. Un estudiante intenta `update profiles set role='admin'` o cambiar `email` → falla.
2. Un estudiante intenta cambiar `status` de su reseña o reinsertarla ya oculta → falla.
3. Registro con correo no institucional y sin invitación → rechazado; no queda fila en `profiles`.
4. Registro con correo en mayúsculas (`@UPTC.EDU.CO`) → se normaliza y funciona.
5. Reseña de un producto con `establishment_id` de otro local → falla por FK compuesta.
6. Segunda reseña del mismo producto en < 30 días, incluso saltándose la app, y dos envíos simultáneos → solo una pasa.
7. Reintento de la misma operación offline (mismo `client_id`) → no duplica.
8. Un vendedor intenta `select` directo en `reviews`, `review_reports`, `search_events`, `product_views` → sin acceso.
9. Un vendedor llama una RPC con el `establishment_id` de otro → `forbidden`.
10. Un vendedor con menos de 5 reseñas no recibe promedios ni comentarios.
11. Un vendedor intenta cambiar `plan`, `status`, `slug` u `owner_id` → falla.
12. Un vendedor intenta subir o sobrescribir una foto en la carpeta de otro local → falla.
13. Cambiar `plan` no modifica promedios ni el orden de resultados.
14. `anon` no puede ejecutar RPC de vendedor ni de admin.

## Riesgos técnicos

- **PostGIS:** disponible en el plan Free; se instala en el schema `extensions` (no en `public`). Confirmar en el dashboard antes de 1.1.
- **CLI de Supabase:** fijado en `2.122.1` (`v2.stable`). La `3.0.0` falla al inicializar el esquema con la imagen de Postgres 15 (`Invalid package config /app/package.json`); revisar al actualizar la imagen o el CLI.
- **Magic link en correos institucionales:** probar entrega y spam; si falla, OTP de 6 dígitos.
- **Hooks de Auth:** confirmar si el *Before User Created hook* está disponible; si no, usar el trigger.
- **Teselas del mapa:** MapTiler Free; mantener la atribución visible y caer a distancia en texto si falla o se agota la cuota.
- **OneDrive:** excluir `node_modules`, `.next` y `.git` de la sincronización.
- **Datos reales:** el seed es ficticio; nunca correos ni teléfonos reales.
- **Tamaño del catálogo local:** si crece mucho, paginar el snapshot; revisar con 20 establecimientos y 200 productos.
