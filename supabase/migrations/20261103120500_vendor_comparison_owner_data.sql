-- Fase 5: decisión explícita para locales suspendidos.
-- `vendor_campus_comparison` cuenta las reseñas publicadas del propio local
-- (no solo las del catálogo público), así que el dueño de un local suspendido
-- conserva sus agregados. El promedio del campus sigue saliendo del pool
-- público (`public_reviews`, locales activos). El local suspendido no aparece
-- en el catálogo y el panel lo avisa.

create or replace function public.vendor_campus_comparison(
  p_establishment_id uuid
)
returns table (
  local_avg numeric,
  campus_avg numeric,
  local_review_count integer
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_count integer;
begin
  if not exists (
    select 1
    from public.establishments e
    where e.id = p_establishment_id
      and e.owner_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*)::integer
    into v_count
    from public.reviews r
   where r.establishment_id = p_establishment_id
     and r.status = 'published';

  if v_count < public.min_reviews_for_stats() then
    return;
  end if;

  return query
    select
      round(
        avg(
          (
            r.rating_sabor + r.rating_cantidad + r.rating_precio
            + r.rating_presentacion + r.rating_calidad_precio
          )::numeric / 5
        ),
        2
      ) as local_avg,
      (
        select round(
          avg(
            (
              c.rating_sabor + c.rating_cantidad + c.rating_precio
              + c.rating_presentacion + c.rating_calidad_precio
            )::numeric / 5
          ),
          2
        )
        from public.public_reviews c
      ) as campus_avg,
      count(*)::integer as local_review_count
    from public.reviews r
    where r.establishment_id = p_establishment_id
      and r.status = 'published';
end $$;
