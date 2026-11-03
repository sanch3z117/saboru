-- Fase 7: creación de locales desde /admin.
-- El admin no tiene INSERT directo sobre establishments: esta es la única vía.
-- Docs: docs/03-ARQUITECTURA-Y-DATOS.md (RPC de admin y modelo de datos).

create function public.admin_create_establishment(
  p_name text,
  p_slug text,
  p_description text,
  p_address text,
  p_block_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_category text,
  p_schedule jsonb
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_description text := btrim(coalesce(p_description, ''));
  v_address text := btrim(coalesce(p_address, ''));
  v_category text := btrim(coalesce(p_category, ''));
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 60 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  if char_length(v_slug) < 3
     or char_length(v_slug) > 80
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_slug' using errcode = '22023';
  end if;

  if char_length(v_description) > 600 then
    raise exception 'invalid_description' using errcode = '22023';
  end if;

  if char_length(v_address) > 120 then
    raise exception 'invalid_address' using errcode = '22023';
  end if;

  if v_category = '' or char_length(v_category) > 40 then
    raise exception 'invalid_category' using errcode = '22023';
  end if;

  if p_block_id is null or not exists (
    select 1 from public.campus_blocks b where b.id = p_block_id
  ) then
    raise exception 'invalid_block' using errcode = '22023';
  end if;

  if p_lat is null
     or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    raise exception 'invalid_coordinates' using errcode = '22023';
  end if;

  if p_schedule is null or jsonb_typeof(p_schedule) <> 'object' then
    raise exception 'invalid_schedule' using errcode = '22023';
  end if;

  insert into public.establishments (
    name,
    slug,
    description,
    address,
    location,
    schedule,
    category,
    status,
    plan
  ) values (
    v_name,
    v_slug,
    v_description,
    v_address,
    extensions.st_point(p_lng, p_lat)::extensions.geography,
    p_schedule,
    v_category,
    'draft',
    'basic'
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'slug_exists' using errcode = 'P0001';
end $$;

revoke execute on function public.admin_create_establishment(
  text, text, text, text, uuid, double precision, double precision, text, jsonb
) from public, anon;
grant execute on function public.admin_create_establishment(
  text, text, text, text, uuid, double precision, double precision, text, jsonb
) to authenticated;
