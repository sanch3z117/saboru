-- Fase 5: el vendedor actualiza la ubicación de su local.
-- PostgREST devuelve `geography` como EWKB hexadecimal, así que la escritura
-- pasa por esta función: valida coordenadas, el local y el dueño, y evita que
-- el cliente tenga que construir WKB.

create function public.vendor_set_establishment_location(
  p_establishment_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    raise exception 'invalid_coordinates' using errcode = '22023';
  end if;

  update public.establishments
     set location = extensions.st_setsrid(
           extensions.st_makepoint(p_lng, p_lat),
           4326
         )::extensions.geography
   where id = p_establishment_id
     and owner_id = auth.uid();

  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

revoke execute on function public.vendor_set_establishment_location(
  uuid, double precision, double precision
) from public, anon;
grant execute on function public.vendor_set_establishment_location(
  uuid, double precision, double precision
) to authenticated;
