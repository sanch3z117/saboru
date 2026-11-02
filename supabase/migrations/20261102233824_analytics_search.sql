-- 1.6 Analítica anónima y búsqueda del catálogo.
-- Docs: docs/03-ARQUITECTURA-Y-DATOS.md (search_events, product_views y búsqueda).

create table public.search_events (
  id uuid primary key default gen_random_uuid(),
  budget integer check (budget is null or budget > 0),
  block_id uuid references public.campus_blocks (id) on delete set null,
  category text check (category is null or char_length(category) <= 50),
  created_at timestamptz not null default now()
);

create index search_events_block_idx on public.search_events (block_id);
create index search_events_created_idx on public.search_events (created_at desc);

create table public.product_views (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index product_views_product_idx on public.product_views (product_id);
create index product_views_created_idx on public.product_views (created_at desc);

-- Sin acceso directo para ningún rol: solo las RPC escriben.
alter table public.search_events enable row level security;
alter table public.product_views enable row level security;
revoke all on public.search_events from anon, authenticated;
revoke all on public.product_views from anon, authenticated;

create function public.log_search(
  p_budget integer,
  p_block_id uuid,
  p_category text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_budget is not null and p_budget <= 0 then
    raise exception 'invalid_budget' using errcode = '22023';
  end if;

  if p_category is not null and char_length(btrim(p_category)) > 50 then
    raise exception 'invalid_category' using errcode = '22023';
  end if;

  if p_block_id is not null
     and not exists (
       select 1 from public.campus_blocks b where b.id = p_block_id
     ) then
    raise exception 'invalid_block' using errcode = '22023';
  end if;

  insert into public.search_events (budget, block_id, category)
  values (
    p_budget,
    p_block_id,
    nullif(btrim(p_category), '')
  );
end $$;

revoke execute on function public.log_search(integer, uuid, text)
  from public, anon, authenticated;
grant execute on function public.log_search(integer, uuid, text)
  to anon, authenticated;

create function public.log_product_view(p_product_id uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.product_views (product_id)
  select p.id
  from public.products p
  join public.establishments e on e.id = p.establishment_id
  where p.id = p_product_id
    and p.available
    and e.status = 'active';
$$;

revoke execute on function public.log_product_view(uuid)
  from public, anon, authenticated;
grant execute on function public.log_product_view(uuid)
  to anon, authenticated;

create function public.search_products(
  p_budget integer,
  p_block_id uuid,
  p_radius_m double precision,
  p_category text
) returns table (
  id uuid,
  establishment_id uuid,
  name text,
  description text,
  price_cop integer,
  category text,
  photo_url text,
  available boolean,
  allergens text[],
  establishment_name text,
  distance_m double precision
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_budget is not null and p_budget <= 0 then
    raise exception 'invalid_budget' using errcode = '22023';
  end if;

  if p_block_id is null
     or not exists (
       select 1 from public.campus_blocks b where b.id = p_block_id
     ) then
    raise exception 'invalid_block' using errcode = '22023';
  end if;

  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > 5000 then
    raise exception 'invalid_radius' using errcode = '22023';
  end if;

  if p_category is not null and char_length(btrim(p_category)) > 50 then
    raise exception 'invalid_category' using errcode = '22023';
  end if;

  return query
    select
      p.id,
      p.establishment_id,
      p.name,
      p.description,
      p.price_cop,
      p.category,
      p.photo_url,
      p.available,
      p.allergens,
      e.name as establishment_name,
      extensions.st_distance(e.location, b.location) as distance_m
    from public.products p
    join public.establishments e on e.id = p.establishment_id
    join public.campus_blocks b on b.id = p_block_id
    where e.status = 'active'
      and p.available
      and (p_budget is null or p.price_cop <= p_budget)
      and (
        nullif(btrim(p_category), '') is null
        or p.category = btrim(p_category)
      )
      and extensions.st_dwithin(e.location, b.location, p_radius_m)
    order by distance_m asc, p.price_cop asc;
end $$;

revoke execute on function public.search_products(
  integer, uuid, double precision, text
) from public, anon, authenticated;
grant execute on function public.search_products(
  integer, uuid, double precision, text
) to anon, authenticated;
