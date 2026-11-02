-- 1.5 Reportes de reseñas y favoritos.
-- Docs: docs/03-ARQUITECTURA-Y-DATOS.md (review_reports y favorites).

create type public.report_status as enum ('open', 'reviewed', 'dismissed');

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  reason text not null
    check (char_length(btrim(reason)) between 1 and 300),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint review_reports_review_reporter_key unique (review_id, reporter_id),
  constraint review_reports_reporter_client_key unique (reporter_id, client_id)
);

create index review_reports_review_idx on public.review_reports (review_id);
create index review_reports_reporter_idx on public.review_reports (reporter_id);
create index review_reports_status_idx on public.review_reports (status);

alter table public.review_reports enable row level security;
revoke all on public.review_reports from anon, authenticated;
grant select on public.review_reports to authenticated;
grant insert (client_id, review_id, reason) on public.review_reports
  to authenticated;

create policy "students insert own reports" on public.review_reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_institutional_student());

create policy "students read own reports or admin" on public.review_reports
  for select to authenticated
  using (
    (public.is_institutional_student() and reporter_id = auth.uid())
    or public.is_admin()
  );

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  establishment_id uuid not null
    references public.establishments (id) on delete cascade,
  product_id uuid,
  created_at timestamptz not null default now(),
  constraint favorites_product_establishment_fkey
    foreign key (product_id, establishment_id)
    references public.products (id, establishment_id) on delete cascade
);

create unique index favorites_unique on public.favorites
  (
    user_id,
    establishment_id,
    coalesce(product_id, '00000000-0000-0000-0000-000000000000')
  );

create index favorites_user_idx on public.favorites (user_id);
create index favorites_establishment_idx on public.favorites (establishment_id);
create index favorites_product_idx on public.favorites (product_id);

alter table public.favorites enable row level security;
revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (establishment_id, product_id) on public.favorites
  to authenticated;

create policy "students select own favorites" on public.favorites
  for select to authenticated
  using (public.is_institutional_student() and user_id = auth.uid());

create policy "students insert own favorites" on public.favorites
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_institutional_student());

create policy "students delete own favorites" on public.favorites
  for delete to authenticated
  using (public.is_institutional_student() and user_id = auth.uid());
