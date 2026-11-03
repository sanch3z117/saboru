-- Fase 3: detalle de búsqueda y vistas públicas con coordenadas.
-- La RPC cambia su tipo de retorno: hay que recrearla y volver a conceder execute.

drop function if exists public.search_products(
  integer,
  uuid,
  double precision,
  text
);

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
  distance_m double precision,
  establishment_slug text,
  establishment_schedule jsonb
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
      extensions.st_distance(e.location, b.location) as distance_m,
      e.slug as establishment_slug,
      e.schedule as establishment_schedule
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

-- Vistas públicas para el snapshot y las fichas: sin owner_id ni datos privados.
create view public.public_establishments as
  select
    id,
    name,
    slug,
    description,
    address,
    category,
    photos,
    schedule,
    status,
    plan,
    extensions.st_y(location::extensions.geometry) as latitude,
    extensions.st_x(location::extensions.geometry) as longitude
  from public.establishments
  where status = 'active';

grant select on public.public_establishments to anon, authenticated;

create view public.public_blocks as
  select
    id,
    name,
    extensions.st_y(location::extensions.geometry) as latitude,
    extensions.st_x(location::extensions.geometry) as longitude
  from public.campus_blocks;

grant select on public.public_blocks to anon, authenticated;
