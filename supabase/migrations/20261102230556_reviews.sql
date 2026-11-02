-- 1.4 Reseñas verificadas, regla de 30 días y vistas públicas.
-- Docs: docs/03-ARQUITECTURA-Y-DATOS.md (reviews, trigger y vistas).

create type public.review_status as enum ('published', 'pending', 'hidden');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null,
  establishment_id uuid not null,
  rating_sabor smallint not null check (rating_sabor between 1 and 5),
  rating_cantidad smallint not null check (rating_cantidad between 1 and 5),
  rating_precio smallint not null check (rating_precio between 1 and 5),
  rating_presentacion smallint not null check (rating_presentacion between 1 and 5),
  rating_calidad_precio smallint not null check (rating_calidad_precio between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  status public.review_status not null default 'published',
  created_at timestamptz not null default now(),
  constraint reviews_user_client_key unique (user_id, client_id),
  constraint reviews_product_establishment_fkey
    foreign key (product_id, establishment_id)
    references public.products (id, establishment_id)
);

create index reviews_product_idx on public.reviews (product_id);
create index reviews_establishment_idx on public.reviews (establishment_id);
create index reviews_user_idx on public.reviews (user_id);
create index reviews_user_product_created_idx
  on public.reviews (user_id, product_id, created_at desc);

create function public.enforce_review_rules() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text || ':' || new.product_id::text, 0)
  );

  if not exists (
    select 1
    from public.products p
    join public.establishments e on e.id = p.establishment_id
    where p.id = new.product_id
      and p.establishment_id = new.establishment_id
      and p.available
      and e.status = 'active'
  ) then
    raise exception 'product_unavailable' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.reviews r
    where r.user_id = new.user_id
      and r.product_id = new.product_id
      and r.created_at > now() - interval '30 days'
  ) then
    raise exception 'review_cooldown' using errcode = 'P0001';
  end if;

  new.created_at := now();
  new.status := 'published';
  return new;
end $$;

revoke execute on function public.enforce_review_rules()
  from public, anon, authenticated;

create trigger reviews_enforce
  before insert on public.reviews
  for each row execute function public.enforce_review_rules();

-- Sin INSERT de status/created_at y sin UPDATE de status: los fija el trigger.
-- Sin DELETE para clientes: borrar y reinsertar saltaría la regla de 30 días.
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to authenticated;
grant insert (
  client_id,
  user_id,
  product_id,
  establishment_id,
  rating_sabor,
  rating_cantidad,
  rating_precio,
  rating_presentacion,
  rating_calidad_precio,
  comment
) on public.reviews to authenticated;
grant update (
  rating_sabor,
  rating_cantidad,
  rating_precio,
  rating_presentacion,
  rating_calidad_precio,
  comment
) on public.reviews to authenticated;

alter table public.reviews enable row level security;

create policy "students insert own reviews" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_institutional_student());

create policy "students edit own recent reviews" on public.reviews
  for update to authenticated
  using (
    user_id = auth.uid()
    and status = 'published'
    and created_at > now() - interval '30 days'
    and public.is_institutional_student()
  )
  with check (user_id = auth.uid());

create policy "read own or admin reviews" on public.reviews
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Vistas públicas: sin user_id ni client_id, solo reseñas publicadas de
-- locales activos. Corren con los privilegios del dueño (como docs/03).
create view public.public_reviews as
  select
    r.id,
    r.product_id,
    r.establishment_id,
    r.rating_sabor,
    r.rating_cantidad,
    r.rating_precio,
    r.rating_presentacion,
    r.rating_calidad_precio,
    r.comment,
    r.created_at
  from public.reviews r
  join public.establishments e
    on e.id = r.establishment_id
   and e.status = 'active'
  where r.status = 'published';

create view public.product_stats as
  select
    product_id,
    count(*)::int as review_count,
    round(avg(rating_sabor), 2) as avg_sabor,
    round(avg(rating_cantidad), 2) as avg_cantidad,
    round(avg(rating_precio), 2) as avg_precio,
    round(avg(rating_presentacion), 2) as avg_presentacion,
    round(avg(rating_calidad_precio), 2) as avg_calidad_precio
  from public.public_reviews
  group by product_id;

grant select on public.public_reviews, public.product_stats
  to anon, authenticated;
