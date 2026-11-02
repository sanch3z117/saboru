-- 1.7 RPC del vendedor (agregados anónimos) y RPC de admin.
-- Docs: docs/03-ARQUITECTURA-Y-DATOS.md (RPC del vendedor y RPC de admin).

-- Umbral de privacidad fijo para el MVP. No depende de GUC de sesión:
-- un cliente con acceso directo no puede bajarlo.
create function public.min_reviews_for_stats() returns integer
language sql immutable set search_path = '' as $$
  select 5;
$$;

revoke execute on function public.min_reviews_for_stats()
  from public, anon, authenticated;

create function public.vendor_product_stats(p_establishment_id uuid)
returns table (
  product_id uuid,
  review_count integer,
  avg_sabor numeric,
  avg_cantidad numeric,
  avg_precio numeric,
  avg_presentacion numeric,
  avg_calidad_precio numeric
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1
    from public.establishments e
    where e.id = p_establishment_id
      and e.owner_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      r.product_id,
      count(*)::integer,
      round(avg(r.rating_sabor), 2),
      round(avg(r.rating_cantidad), 2),
      round(avg(r.rating_precio), 2),
      round(avg(r.rating_presentacion), 2),
      round(avg(r.rating_calidad_precio), 2)
    from public.reviews r
    where r.establishment_id = p_establishment_id
      and r.status = 'published'
    group by r.product_id
    having count(*) >= public.min_reviews_for_stats();
end $$;

revoke execute on function public.vendor_product_stats(uuid)
  from public, anon;
grant execute on function public.vendor_product_stats(uuid)
  to authenticated;

create function public.vendor_top_products(p_establishment_id uuid)
returns table (product_id uuid, name text, view_count integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1
    from public.establishments e
    where e.id = p_establishment_id
      and e.owner_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select p.id, p.name, count(v.id)::integer
    from public.products p
    join public.product_views v on v.product_id = p.id
    where p.establishment_id = p_establishment_id
    group by p.id, p.name
    order by count(v.id) desc, p.name asc
    limit 10;
end $$;

revoke execute on function public.vendor_top_products(uuid)
  from public, anon;
grant execute on function public.vendor_top_products(uuid)
  to authenticated;

create function public.vendor_views_by_hour(p_establishment_id uuid)
returns table (hour integer, view_count integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1
    from public.establishments e
    where e.id = p_establishment_id
      and e.owner_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      extract(
        hour from (v.created_at at time zone 'America/Bogota')
      )::integer,
      count(*)::integer
    from public.product_views v
    join public.products p on p.id = v.product_id
    where p.establishment_id = p_establishment_id
    group by 1
    order by 1;
end $$;

revoke execute on function public.vendor_views_by_hour(uuid)
  from public, anon;
grant execute on function public.vendor_views_by_hour(uuid)
  to authenticated;

create function public.vendor_campus_comparison(p_establishment_id uuid)
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
    from public.public_reviews r
   where r.establishment_id = p_establishment_id;

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
    from public.public_reviews r
    where r.establishment_id = p_establishment_id;
end $$;

revoke execute on function public.vendor_campus_comparison(uuid)
  from public, anon;
grant execute on function public.vendor_campus_comparison(uuid)
  to authenticated;

create function public.vendor_recent_comments(p_establishment_id uuid)
returns table (
  product_id uuid,
  product_name text,
  rating_sabor smallint,
  rating_cantidad smallint,
  rating_precio smallint,
  rating_presentacion smallint,
  rating_calidad_precio smallint,
  comment text,
  created_at timestamptz
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
      p.id,
      p.name,
      r.rating_sabor,
      r.rating_cantidad,
      r.rating_precio,
      r.rating_presentacion,
      r.rating_calidad_precio,
      r.comment,
      r.created_at
    from public.reviews r
    join public.products p on p.id = r.product_id
    where r.establishment_id = p_establishment_id
      and r.status = 'published'
      and r.comment is not null
      and btrim(r.comment) <> ''
    order by r.created_at desc
    limit 10;
end $$;

revoke execute on function public.vendor_recent_comments(uuid)
  from public, anon;
grant execute on function public.vendor_recent_comments(uuid)
  to authenticated;

-- RPC de admin: volatile, verifican is_admin() y validan con enums tipados.
create function public.admin_set_review_status(
  p_review_id uuid,
  p_status public.review_status
) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.reviews set status = p_status where id = p_review_id;

  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
end $$;

revoke execute on function public.admin_set_review_status(uuid, public.review_status)
  from public, anon;
grant execute on function public.admin_set_review_status(uuid, public.review_status)
  to authenticated;

create function public.admin_resolve_report(
  p_report_id uuid,
  p_status public.report_status
) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.review_reports set status = p_status where id = p_report_id;

  if not found then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;
end $$;

revoke execute on function public.admin_resolve_report(uuid, public.report_status)
  from public, anon;
grant execute on function public.admin_resolve_report(uuid, public.report_status)
  to authenticated;

create function public.admin_set_establishment_status(
  p_establishment_id uuid,
  p_status public.establishment_status
) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.establishments
     set status = p_status
   where id = p_establishment_id;

  if not found then
    raise exception 'establishment_not_found' using errcode = 'P0002';
  end if;
end $$;

revoke execute on function public.admin_set_establishment_status(
  uuid, public.establishment_status
) from public, anon;
grant execute on function public.admin_set_establishment_status(
  uuid, public.establishment_status
) to authenticated;

create function public.admin_set_establishment_plan(
  p_establishment_id uuid,
  p_plan public.establishment_plan
) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.establishments
     set plan = p_plan
   where id = p_establishment_id;

  if not found then
    raise exception 'establishment_not_found' using errcode = 'P0002';
  end if;
end $$;

revoke execute on function public.admin_set_establishment_plan(
  uuid, public.establishment_plan
) from public, anon;
grant execute on function public.admin_set_establishment_plan(
  uuid, public.establishment_plan
) to authenticated;

create function public.admin_create_vendor_invite(
  p_email text,
  p_establishment_id uuid
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_email = ''
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.establishments e where e.id = p_establishment_id
  ) then
    raise exception 'establishment_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.establishments e
    where e.id = p_establishment_id
      and e.owner_id is not null
  ) then
    raise exception 'establishment_has_owner' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.profiles p where lower(p.email) = v_email
  ) then
    raise exception 'email_already_registered' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.vendor_invites v
    where lower(v.email) = v_email
      and v.accepted_at is null
  ) then
    raise exception 'invite_exists' using errcode = 'P0001';
  end if;

  insert into public.vendor_invites (email, establishment_id, invited_by)
  values (v_email, p_establishment_id, auth.uid())
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'invite_exists' using errcode = 'P0001';
end $$;

revoke execute on function public.admin_create_vendor_invite(text, uuid)
  from public, anon;
grant execute on function public.admin_create_vendor_invite(text, uuid)
  to authenticated;
