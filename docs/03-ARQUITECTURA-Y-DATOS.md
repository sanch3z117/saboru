# SaborU — Arquitectura y datos

> Fuente de verdad técnica. Si algo contradice a `AGENTS.md`, gana `AGENTS.md`. El offline se detalla en `docs/04-OFFLINE-PWA.md`.

## Stack

| Capa                 | Tecnología                                               | Motivo                                                                          |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Frontend             | Next.js 15 (App Router) + React 19 + TypeScript estricto | Un código para móvil y escritorio, SSR y server actions                         |
| Estilos              | Tailwind CSS + shadcn/ui                                 | Rapidez y accesibilidad                                                         |
| Base de datos        | Supabase (Postgres 15) + PostGIS                         | Relacional, cercanía geográfica, RLS                                            |
| Autenticación        | Supabase Auth                                            | Magic link/OTP y sesiones seguras                                               |
| Archivos             | Supabase Storage                                         | Fotos de establecimientos y productos                                           |
| PWA / offline        | Serwist (`@serwist/next`, `serwist`) + `idb`             | Service worker robusto e IndexedDB                                              |
| Mapas                | MapLibre GL + MapTiler / OSM                            | Solo con conexión; MapTiler Free con atribución y fallback OSM o a distancia en texto |
| Validación           | Zod + React Hook Form                                    | Reglas compartidas cliente/servidor                                             |
| Límite de peticiones | Upstash Ratelimit (plan gratuito)                        | Rate limiting en Vercel                                                         |
| Pruebas              | Vitest + Testing Library + `fake-indexeddb` + Playwright | Unitarias, integración y E2E                                                    |
| Hosting              | Vercel + Supabase Cloud                                  | Despliegue simple                                                               |

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
│   ├── components/ (ui, discovery, map, catalog, reviews, vendor, offline)
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

| Campo                 | Tipo                              | Notas                                                                          |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `id`                  | uuid PK                           | FK `auth.users.id` on delete cascade                                           |
| `role`                | enum `student \| vendor \| admin` | Lo fija el trigger; no editable por el usuario                                 |
| `full_name`           | text                              | Único campo editable por el usuario                                            |
| `email`               | text unique                       | Copia informativa en minúsculas; **no** es fuente de verdad                    |
| `privacy_accepted_at` | timestamptz                       | Copiado de `raw_user_meta_data` al crear el perfil; nulo en cuentas anteriores |
| `privacy_version`     | text                              | Versión aceptada de la política (`src/lib/auth/privacy.ts`)                    |
| `created_at`          | timestamptz                       |                                                                                |

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

| Campo                         | Tipo               | Notas                                          |
| ----------------------------- | ------------------ | ---------------------------------------------- |
| `id`                          | uuid PK            |                                                |
| `email`                       | text               | Se compara en minúsculas                       |
| `establishment_id`            | uuid               | NOT NULL; FK a `establishments.id` (desde 1.3) |
| `invited_by`                  | uuid               | FK `profiles.id` (admin)                       |
| `expires_at`                  | timestamptz        | Por defecto 7 días                             |
| `accepted_at` / `accepted_by` | timestamptz / uuid | Nulos hasta aceptar                            |
| `created_at`                  | timestamptz        |                                                |

RLS: solo admin (`is_admin()`) para SELECT/INSERT/UPDATE. Un vendedor no la ve.

En 1.3 se agregó la FK `establishment_id → public.establishments (id)` y el backfill de `establishments.owner_id` desde las invitaciones aceptadas (`accepted_by`), que solo toca locales sin dueño. Una invitación con `establishment_id` inexistente falla por FK (probado).

### `demo_email_allowlist` (solo Fase 8.1)

| Campo        | Tipo        | Notas                                      |
| ------------ | ----------- | ------------------------------------------ |
| `email`      | text PK     | Correo externo que se permite una vez      |
| `created_at` | timestamptz | La fila caduca a los 15 minutos            |

- Solo la escribe el `service_role` desde `requestStudentMagicLink` cuando `DEMO_ALLOW_ANY_EMAIL=true`. No tiene políticas para `anon` ni `authenticated`; RLS está activa y los permisos están revocados.
- `handle_new_user()` la consulta solo para correos externos, crea el perfil `student` y consume la fila. En producción la tabla está vacía y la regla `@uptc.edu.co` sigue siendo la única vía normal.
- Un correo externo admitido por esta tabla **no** puede reseñar ni guardar favoritos: `is_institutional_student()` sigue exigiendo el dominio institucional.

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
  v_privacy_accepted_at timestamptz :=
    nullif(new.raw_user_meta_data->>'privacy_accepted_at', '')::timestamptz;
  v_privacy_version text :=
    nullif(new.raw_user_meta_data->>'privacy_version', '');
begin
  select * into v_invite from public.vendor_invites
   where lower(email) = v_email and accepted_at is null and expires_at > now()
   limit 1;

  if found then
    insert into public.profiles (
      id, role, email, full_name, privacy_accepted_at, privacy_version
    )
    values (
      new.id, 'vendor', v_email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      v_privacy_accepted_at, v_privacy_version
    );
    update public.vendor_invites set accepted_at = now(), accepted_by = new.id where id = v_invite.id;
    update public.establishments e
       set owner_id = new.id
     where e.id = v_invite.establishment_id
       and e.owner_id is null;
  elsif v_email like '%@uptc.edu.co'
     or exists (
       select 1 from public.demo_email_allowlist a
        where a.email = v_email
          and a.created_at > now() - interval '15 minutes'
     ) then
    insert into public.profiles (
      id, role, email, full_name, privacy_accepted_at, privacy_version
    )
    values (
      new.id, 'student', v_email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      v_privacy_accepted_at, v_privacy_version
    );
    delete from public.demo_email_allowlist where email = v_email;
  else
    raise exception 'email_domain_not_allowed' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
```

- Si el trigger lanza error, el registro se revierte: no queda cuenta ni perfil.
- **Modo demo:** además del dominio institucional, el trigger acepta un correo externo si está en `demo_email_allowlist` (fila de menos de 15 minutos). Esa tabla solo la escribe el servidor con `service_role` y la fila se consume al crear el perfil. El registro normal y las reseñas/favoritos no cambian.
- Alternativa más limpia: un _Before User Created hook_ de Supabase Auth con la misma lógica. Verificar en la documentación vigente cuál está disponible en el plan.
- **Cambio de correo:** desactivar el cambio de email en Auth o aplicar la misma regla; `is_institutional_student()` lee `auth.users` en cada llamada, por lo que un cambio a un dominio ajeno bloquea las reseñas.
- **Admin:** se asigna manualmente en la base (`update profiles set role='admin'` con `service_role` o SQL editor). No hay registro público de admin.

### `campus_blocks`

| Campo      | Tipo                              | Notas                               |
| ---------- | --------------------------------- | ----------------------------------- |
| `id`       | uuid PK                           |                                     |
| `name`     | text                              | Ej. "Bloque A", "Cafetería central" |
| `location` | extensions.geography(Point, 4326) |                                     |

### `establishments`

| Campo                       | Tipo                                           | Notas                                                |
| --------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `id`                        | uuid PK                                        |                                                      |
| `owner_id`                  | uuid null                                      | FK `profiles.id`; se asigna al aceptar la invitación |
| `name` / `slug`             | text                                           | `slug` único, lo crea el admin                       |
| `description`, `address`    | text                                           |                                                      |
| `location`                  | extensions.geography(Point, 4326)              | Índice GIST                                          |
| `schedule`                  | jsonb                                          | Formato abajo; validado con Zod                      |
| `category`                  | text                                           |                                                      |
| `photos`                    | text[]                                         | Rutas de Storage                                     |
| `status`                    | enum `draft \| pending \| active \| suspended` | Solo admin                                           |
| `plan`                      | enum `basic \| featured \| pro`                | Solo admin                                           |
| `created_at` / `updated_at` | timestamptz                                    |                                                      |

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
  "mon": [["07:00", "17:00"]],
  "tue": [["07:00", "17:00"]],
  "wed": [["07:00", "17:00"]],
  "thu": [["07:00", "17:00"]],
  "fri": [["07:00", "16:00"]],
  "sat": [],
  "sun": []
}
```

Hora local `America/Bogota`. Un cierre menor que la apertura (ej. `["18:00","02:00"]`) significa cruce de medianoche. El editor del panel admite hasta dos franjas por día; el formato soporta más, pero el MVP no las edita (deuda si un local necesita tres).

### `products`

| Campo                       | Tipo        | Notas                   |
| --------------------------- | ----------- | ----------------------- |
| `id`                        | uuid PK     |                         |
| `establishment_id`          | uuid        | FK                      |
| `name`, `description`       | text        |                         |
| `price_cop`                 | integer     | `check (price_cop > 0)` |
| `category`                  | text        |                         |
| `photo_url`                 | text        |                         |
| `available`                 | boolean     |                         |
| `allergens`                 | text[]      |                         |
| `created_at` / `updated_at` | timestamptz |                         |

`unique (id, establishment_id)` para la FK compuesta de `reviews`. El vendedor puede `INSERT` (la política verifica que `establishment_id` sea de su propiedad) y `UPDATE` de todas las columnas **menos** `id` y `establishment_id`.

### `reviews`

| Campo                                                                                              | Tipo                                  | Notas                                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `id`                                                                                               | uuid PK                               |                                                                                       |
| `client_id`                                                                                        | uuid                                  | Identificador de la cola offline; `unique (user_id, client_id)`                       |
| `user_id`                                                                                          | uuid                                  | FK `profiles.id`                                                                      |
| `product_id`, `establishment_id`                                                                   | uuid                                  | **FK compuesta** `(product_id, establishment_id)` → `products (id, establishment_id)` |
| `rating_sabor`, `rating_cantidad`, `rating_precio`, `rating_presentacion`, `rating_calidad_precio` | smallint                              | `check between 1 and 5`                                                               |
| `comment`                                                                                          | text                                  | Opcional, máx. 500 caracteres                                                         |
| `status`                                                                                           | enum `published \| pending \| hidden` | Lo fija el trigger; solo admin lo cambia                                              |
| `created_at`                                                                                       | timestamptz                           | Lo fija el trigger                                                                    |

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

| Campo         | Tipo                                 | Notas                                                       |
| ------------- | ------------------------------------ | ----------------------------------------------------------- |
| `id`          | uuid PK                              |                                                             |
| `client_id`   | uuid                                 | Idempotencia offline                                        |
| `review_id`   | uuid                                 | FK `reviews.id`, `on delete cascade`                        |
| `reporter_id` | uuid                                 | FK `profiles.id`, `default auth.uid()`, `on delete cascade` |
| `reason`      | text                                 | Máx. 300 caracteres                                         |
| `status`      | enum `open \| reviewed \| dismissed` | Solo admin lo cambia (RPC)                                  |
| `created_at`  | timestamptz                          |                                                             |

`unique (review_id, reporter_id)` y `unique (reporter_id, client_id)`. Estudiante: `INSERT` propio (solo `review_id`, `reason`, `client_id`; `reporter_id` se llena con `default auth.uid()`), y `SELECT` propio solo mientras siga siendo estudiante institucional. **El vendedor no ve reportes** (`reporter_id` es dato personal). Admin: lectura de todos; el cambio de `status` va por RPC (1.7). Sin `UPDATE` ni `DELETE` para clientes.

### `favorites`

| Campo              | Tipo        | Notas                                                              |
| ------------------ | ----------- | ------------------------------------------------------------------ |
| `id`               | uuid PK     |                                                                    |
| `user_id`          | uuid        | FK `profiles.id`, `default auth.uid()`, `on delete cascade`        |
| `establishment_id` | uuid        | FK `establishments.id`, `on delete cascade`                        |
| `product_id`       | uuid null   | FK compuesta `(product_id, establishment_id)`, `on delete cascade` |
| `created_at`       | timestamptz |                                                                    |

```sql
create unique index favorites_unique on public.favorites
  (user_id, establishment_id, coalesce(product_id, '00000000-0000-0000-0000-000000000000'));
```

Estudiante: `SELECT`/`INSERT`/`DELETE` propias (`user_id = auth.uid()`) y solo mientras siga siendo estudiante institucional; sin `UPDATE`. Nadie más. La FK compuesta usa MATCH SIMPLE: si `product_id` es null solo se valida el local.

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
  where p.id = p_product_id and p.available and e.status = 'active';
$$;
grant execute on function public.log_product_view(uuid) to anon, authenticated;
```

`log_product_view` exige producto disponible y local activo. `log_search` valida presupuesto > 0 (o null), categoría ≤ 50 y bloque existente si viene. Ambas son `security definer` con `search_path = ''`.

Se llaman desde el servidor con rate limit. **No se encolan offline.**

## RPC del vendedor (únicas lecturas de estadísticas)

Todas verifican que el llamante sea dueño del establecimiento, devuelven agregados y **suprimen resultados con menos de N reseñas** (`public.min_reviews_for_stats()`, hard-code 5 en el MVP: no depende de un GUC de sesión que un cliente pudiera bajar; ver `docs/06-DECISIONES-PASO-0.md`).

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

- `vendor_top_products(p_establishment_id)`: hasta 10 productos más consultados (de `product_views`), solo del local.
- `vendor_views_by_hour(p_establishment_id)`: consultas por hora (`America/Bogota`).
- `vendor_campus_comparison(p_establishment_id)`: promedio global de los 5 criterios del local vs. campus; sin filas si el local no alcanza el mínimo.
- `vendor_recent_comments(p_establishment_id)`: últimos 10 comentarios no vacíos de reseñas `published`, con `product_id` y `product_name`, **sin autor ni id de usuario**, solo si el local supera el mínimo de reseñas.
- `vendor_set_establishment_location(p_establishment_id, p_lat, p_lng)`: única vía para mover el punto del local. Valida rango de coordenadas (`-90..90`, `-180..180`) y que el local sea del llamante; PostgREST entrega `geography` como EWKB hexadecimal, así que el cliente no construye WKB.
- Las RPC de vendedor son `stable`; las de admin, `volatile`. `vendor_set_establishment_location` es la excepción `volatile` (escribe).
- **Local suspendido:** las RPC siguen devolviendo los agregados al dueño (incluida `vendor_campus_comparison`, que cuenta las reseñas `published` del propio local aunque esté suspendido). El promedio del campus sale solo de `public_reviews` (locales activos). El local suspendido no aparece en el catálogo y el panel lo avisa.

## RPC de admin (`security definer`, verifican `is_admin()`)

`admin_set_review_status(review_id, status)`, `admin_resolve_report(report_id, status)`, `admin_set_establishment_status(id, status)`, `admin_set_establishment_plan(id, plan)`, `admin_create_vendor_invite(email, establishment_id)` y `admin_create_establishment(name, slug, description, address, block_id, lat, lng, category, schedule)`. Cambiar `plan` **no** altera promedios ni orden. La invitación valida email normalizado, local existente y sin dueño, email no registrado y `invite_exists` si ya hay una abierta. La creación de local valida nombre, slug único, bloque, coordenadas, categoría y horario; nace en `draft`, `basic` y sin dueño. `admin_create_establishment` es la única vía de alta: el admin no tiene `INSERT` directo sobre `establishments`.

## Matriz RLS y permisos (resumen)

| Tabla / objeto                    | Anónimo                             | Estudiante                                                                         | Vendedor                                                             | Admin                           |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------- |
| `establishments`                  | SELECT si `active`                  | SELECT activos                                                                     | SELECT activos y el propio; UPDATE de columnas permitidas del propio | SELECT todo; cambios por RPC    |
| `products`                        | SELECT si disponible y local activo | igual                                                                              | CRUD del propio local                                                | SELECT todo                     |
| `reviews` (tabla)                 | —                                   | INSERT propio; UPDATE de rating/comentario propio dentro de 30 días; SELECT propio | **Sin acceso**                                                       | SELECT todo; estado por RPC     |
| `public_reviews`, `product_stats` | SELECT                              | SELECT                                                                             | SELECT                                                               | SELECT                          |
| `review_reports`                  | —                                   | INSERT y SELECT propios                                                            | **Sin acceso**                                                       | SELECT todo; estado por RPC     |
| `favorites`                       | —                                   | CRUD propio                                                                        | —                                                                    | —                               |
| `profiles`                        | —                                   | SELECT propio; UPDATE solo `full_name`                                             | igual                                                                | SELECT todo; rol por SQL manual |
| `vendor_invites`                  | —                                   | —                                                                                  | —                                                                    | Todo vía RPC/RLS admin          |
| `demo_email_allowlist`            | —                                   | —                                                                                  | —                                                                    | Solo `service_role` (servidor)  |
| `search_events`, `product_views`  | — (solo vía RPC de registro)        | —                                                                                  | — (solo vía RPC de agregados)                                        | — (solo vía RPC)                |
| `campus_blocks`                   | SELECT                              | SELECT                                                                             | SELECT                                                               | Todo                            |

Regla: ninguna tabla nueva sin `enable row level security` y sus políticas. Nunca `using (true)` ni `with check (true)`.

## Storage

- Bucket `establishment-photos`: lectura pública; escritura solo en la ruta `{establishment_id}/...` si el usuario es dueño de ese establecimiento (política sobre `storage.objects`). El primer segmento se valida como UUID con `public.photo_establishment_id(text)`, de modo que una ruta inválida no puede colarse por un cast.
- Nombres de archivo con UUID aleatorio, tipos permitidos `image/jpeg`, `image/png` e `image/webp`, y tamaño máximo 5 MB (configurado en el bucket: `file_size_limit` y `allowed_mime_types`). El servidor vuelve a validar tipo y tamaño antes de subir.
- Un vendedor no puede escribir, sobrescribir ni borrar fotos de otro local; tampoco puede mover un objeto a otra carpeta en un `update`.
- La columna `establishments.photos` guarda rutas de Storage (no URLs); `products.photo_url` guarda una ruta o una URL pública. La UI arma la URL con `photoSrc` (`src/lib/photos.ts`).
- **Fotos demo:** `public/demo/*.webp` y `docs/demo/CREDITS.md`. El script local `npm run demo:photos` (Node con `--env-file=.env.local`) sube al bucket y actualiza `establishments.photos`/`products.photo_url`; es idempotente, acepta `--dry-run`, nunca imprime la service role y aborta en CI/producción. La app nunca importa ni usa la service role.
- La parte de Storage de la prueba 12 se valida en la Fase 5; en 1.3 solo se probó la parte de tabla (`photos` de otro local no se puede actualizar).

## Cartelera y fichas (Fase 7.5.3)

- `EstablishmentCard` y `ProductCard` toman datos públicos de `public_establishments`, `products` y `product_stats`: foto, precio mínimo, distancia desde el bloque por defecto, rating agregado con mínimo 5 reseñas, horario y plan/estado.
- `Destacado` depende del plan; `Activo` del estado real. **“Verificado” no se usa para locales activos**: queda reservado a la reseña verificada o a un flag real futuro.
- La ficha de local reutiliza `CampusMap` con un solo marcador; no se agrega lógica nueva al mapa. La ficha de producto y la de local generan `generateMetadata` y `opengraph-image` públicos (1200×630) con foto o fallback de marca.
- El favorito usa `getFavoriteContext` (estado propio en servidor), IndexedDB y outbox. El estado del servidor manda cuando está disponible; una operación local solo gana si es posterior a la carga de la página.

## Búsqueda del catálogo

- **Fuente única de lógica:** `src/lib/catalog/search.ts` (función pura) aplica texto, presupuesto, distancia desde un origen, categoría, abierto ahora, orden y paginación. La usa el descubrimiento online y la búsqueda offline.
- **Texto (`q`):** se normaliza sin acentos y busca en nombre y descripción del producto, nombre y descripción del local y categoría; varias palabras se combinan con AND.
- **Origen:** la ubicación del usuario si existe; si no, el bloque de la URL o el bloque por defecto; si no hay bloque válido, el centro del campus. `bloque` es legado y solo sirve como respaldo.
- **Online:** `/` y `/buscar` descargan el snapshot público y ejecutan `snapshotToSearchItems(snapshot, origin)` + `searchCatalog`. No llaman al RPC. El rating por local se calcula con `product_stats`: promedio de los productos con al menos 5 reseñas; los locales sin datos quedan al final y el mismo valor se usa en mapa, lista y sheet.
- **URL:** `q`, `categoria`, `presupuesto`, `abierto`, `orden` y `pagina` son el estado compartible; los chips actualizan la URL sin recargar y el texto se debounce.
- **RPC:** `search_products(p_budget, p_block_id, p_radius_m, p_category)` se conserva para la API y las pruebas de paridad; no es la fuente del descubrimiento. La función pura debe seguir dando el mismo resultado con los mismos datos.

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
- `search_products` es `stable security definer` con `search_path = ''`: `p_budget` null significa "sin límite" (no cero filas), `p_block_id` es obligatorio, `0 < p_radius_m <= 5000` y `p_category` null o de máximo 50 caracteres.
- El bloque por defecto de la UI es **"Bloque Central"**; si no existe en la base, se usa el primero por nombre.
- Hora siempre en `America/Bogota`, calculada en el servidor (online) o con el reloj del dispositivo ajustado a esa zona (offline; solo para mostrar, nunca para reglas de negocio).
- Prueba obligatoria: la función pura y el RPC dan el mismo resultado con los mismos datos.

## Mapa del campus (Fase 7.5.1)

- **Librería:** `maplibre-gl@6.16.0` fijado exacto. Se carga solo en cliente con `CampusMapLoader` (`dynamic(..., { ssr: false })`) desde la superficie de descubrimiento compartida por `/` y `/buscar`. No se importa en `/offline`, panel ni admin.
- **Worker:** `public/maplibre/maplibre-gl-worker.mjs`, copiado desde `node_modules` por `scripts/copy-maplibre-worker.mjs` en `prebuild`/`predev`. `setWorkerUrl` apunta a esa ruta same-origin; la CSP mantiene `worker-src 'self' blob:`.
- **Datos:** el descubrimiento descarga `GET /api/catalog/snapshot`; `src/lib/map/places.ts` (función pura) agrupa por local, calcula precio mínimo, rating agregado desde `product_stats` (mínimo 5 reseñas por producto) y distancia con haversine. No hay RPC nuevo ni migración. Los bloques salen del snapshot y el centro de respaldo es `5.5520095, -73.3566646`.
- **Estilo:** MapTiler `streets-v2` si existe `NEXT_PUBLIC_MAPTILER_KEY`; si falta o está vacía, raster de OpenStreetMap con atribución visible. La clave es pública por diseño, no un secreto de servidor.
- **Ubicación:** `useGeolocation` solo se dispara con “Usar mi ubicación”; no persiste ni envía coordenadas. Si se niega, falla o expira, se usa el bloque de la URL o el bloque por defecto, y el centro del campus como último respaldo; la UI lo avisa.
- **Online-only:** el mapa no lee IndexedDB ni el snapshot offline. Si fallan las teselas, el worker o la red, se muestra `MapFallback` y la lista de resultados sigue visible. El service worker excluye teselas, estilos, sprites y glifos (ver `docs/04`).
- **Componentes:** `campus-map`, `campus-map-loader`, `map-marker` (Pin-U), `map-popup`, `map-controls`, `map-fallback` y `map-skeleton`; la superficie de descubrimiento vive en `components/discovery/` (`DiscoverySurface`, búsqueda, resultados y sheet móvil).

## Snapshot y sincronización

- `GET /api/catalog/snapshot`: devuelve solo datos públicos (establecimientos activos, productos disponibles, bloques, `product_stats`, reseñas publicadas recientes sin `user_id`) con `version` y `generated_at`. Sin cookies ni datos privados; cacheable.
- Usa las vistas `public_establishments` y `public_blocks` (sin `owner_id`, con latitud/longitud), `product_stats` y `public_reviews`, y responde con `Cache-Control` público.
- `POST /api/sync`: recibe un lote (máx. 20) de operaciones `{ client_id, type: 'review' | 'favorite' | 'report', payload }`. Requiere sesión, valida con Zod, aplica rate limit y llama a los **mismos servicios** que las server actions. Responde por operación: `ok`, `duplicate` (mismo `client_id`, se trata como éxito) o `rejected` con código (`review_cooldown`, `product_unavailable`, `invalid`, `forbidden`). Las rechazadas no se reintentan.
- La hora y el estado los decide el servidor.

## Autenticación y roles

- Estudiante: magic link/OTP; el dominio se rechaza en la base (trigger) y también antes en la UI para dar un mensaje claro.
- Vendedor: solo por invitación de admin (`vendor_invites`); se asocia al establecimiento al aceptar.
- Admin: asignación manual.
- Guards de servidor: `requireUser()`, `requireRole('vendor')`, `requireRole('admin')`. La UI oculta acciones, pero la seguridad real es RLS + permisos de columna + RPC.
- Tras el login, redirección por rol. Al cerrar sesión se limpian cachés y datos locales privados (ver `docs/04`).

**Primer admin (manual):** registrarse con un correo institucional y luego, con `service_role` o el SQL editor:

```sql
update public.profiles set role = 'admin' where lower(email) = 'admin@uptc.edu.co';
```

**Invitación de prueba:** con un admin ya creado:

```sql
insert into public.vendor_invites (email, establishment_id, invited_by)
select 'vendedor@example.com', e.id, p.id
from public.establishments e, public.profiles p
where e.slug = 'seed-comedor-la-cosecha'
  and lower(p.email) = 'admin@uptc.edu.co'
  and p.role = 'admin';
```

**Local:** los magic links llegan a Inbucket/Mailpit en `http://127.0.0.1:54324`. `.env.local` se genera desde `supabase status -o env` y no se versiona.

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # nunca NEXT_PUBLIC_, solo servidor
NEXT_PUBLIC_MAPTILER_KEY=         # opcional; sin clave se usa OSM
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

`.env.local` no se versiona; `.env.example` sí, sin valores.

## Seguridad y privacidad

- RLS activa y probada en todas las tablas; permisos por columna donde aplique.
- Zod en cada server action y route handler. Sin `any`.
- Rate limit con Upstash, por usuario e IP: reseñas (p. ej. 10/hora), reportes (p. ej. 20/hora), `/api/sync`, registro de vistas y búsquedas. Valores iniciales ajustables.
- Comentarios de reseñas: texto plano, sin HTML, longitud máxima; moderación por reportes.
- Cabeceras en `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y CSP **report-only** compatible con Next/MapLibre. HSTS solo en producción y sin `preload`. HTTPS y cookies `SameSite=Lax`.
- Sin datos personales en analítica. `/privacidad` publica la política (Ley 1581 de 2012); el registro exige aceptar el consentimiento de forma explícita y el servidor lo valida. Los magic links envían `privacy_accepted_at` y `privacy_version` en `options.data`; `handle_new_user` los copia a `profiles` para dejar trazabilidad de la versión aceptada.
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
- **Hooks de Auth:** confirmar si el _Before User Created hook_ está disponible; si no, usar el trigger.
- **Teselas del mapa:** MapTiler Free; mantener la atribución visible y caer a distancia en texto si falla o se agota la cuota.
- **OneDrive:** excluir `node_modules`, `.next` y `.git` de la sincronización.
- **Datos reales:** el seed es ficticio; nunca correos ni teléfonos reales.
- **Tamaño del catálogo local:** si crece mucho, paginar el snapshot; revisar con 20 establecimientos y 200 productos.
- **Actualización de UI tras mutar (React 19.2.9 + Next 15.5.28):** en producción (`next start`) el árbol RSC actualizado se pierde de forma intermitente (~15–30 %). Se comprobó que el servidor renderiza con datos frescos y que el payload `?_rsc=` responde 200, pero el cliente no lo aplica; pasa con `router.refresh()`, con `useActionState`, con navegación `router.replace` (incluso con URL única) y también sin service worker. En `next dev` no ocurre. Mitigación actual: tras guardar (reseñas y panel del vendedor) se recarga la página completa y el aviso de éxito se conserva en `sessionStorage`; en el panel, si la respuesta de la acción también se pierde, una recarga de respaldo a los 4 s evita dejar datos viejos. Revisar al actualizar React o Next y quitar las recargas cuando deje de reproducirse.
