-- 1.3 Bloques del campus, establecimientos y productos.
-- Orden deliberado: tablas → FK de vendor_invites → backfill de owner_id → trigger.

create type public.establishment_status as enum (
  'draft',
  'pending',
  'active',
  'suspended'
);

create type public.establishment_plan as enum ('basic', 'featured', 'pro');

create table public.campus_blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location extensions.geography(Point, 4326) not null,
  created_at timestamptz not null default now()
);

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id),
  name text not null,
  slug text not null,
  description text not null default '',
  address text not null default '',
  location extensions.geography(Point, 4326) not null,
  schedule jsonb not null default '{}'::jsonb,
  category text not null default '',
  photos text[] not null default '{}'::text[],
  status public.establishment_status not null default 'draft',
  plan public.establishment_plan not null default 'basic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint establishments_slug_key unique (slug)
);

create index establishments_location_gist
  on public.establishments using gist (location);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id),
  name text not null,
  description text not null default '',
  price_cop integer not null,
  category text not null default '',
  photo_url text,
  available boolean not null default true,
  allergens text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_positive check (price_cop > 0),
  constraint products_id_establishment_key unique (id, establishment_id)
);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger establishments_set_updated_at
  before update on public.establishments
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- campus_blocks: catálogo público de solo lectura (lo escribe el seed/migraciones).
alter table public.campus_blocks enable row level security;
revoke all on public.campus_blocks from anon, authenticated;
grant select on public.campus_blocks to anon, authenticated;

create policy "campus_blocks_public_select" on public.campus_blocks
  for select to anon, authenticated
  using (id is not null);

alter table public.establishments enable row level security;
revoke all on public.establishments from anon, authenticated;
grant select on public.establishments to anon, authenticated;
grant update (name, description, address, location, schedule, category, photos)
  on public.establishments to authenticated;

create policy "establishments_select_public" on public.establishments
  for select to anon
  using (status = 'active');

create policy "establishments_select_authenticated" on public.establishments
  for select to authenticated
  using (status = 'active' or owner_id = auth.uid() or public.is_admin());

create policy "establishments_update_owner" on public.establishments
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert (
  establishment_id,
  name,
  description,
  price_cop,
  category,
  photo_url,
  available,
  allergens
) on public.products to authenticated;
grant update (
  name,
  description,
  price_cop,
  category,
  photo_url,
  available,
  allergens
) on public.products to authenticated;
grant delete on public.products to authenticated;

create policy "products_select_public" on public.products
  for select to anon
  using (
    available
    and exists (
      select 1
      from public.establishments e
      where e.id = establishment_id
        and e.status = 'active'
    )
  );

create policy "products_select_authenticated" on public.products
  for select to authenticated
  using (
    (
      available
      and exists (
        select 1
        from public.establishments e
        where e.id = establishment_id
          and e.status = 'active'
      )
    )
    or exists (
      select 1
      from public.establishments e
      where e.id = establishment_id
        and e.owner_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "products_insert_owner" on public.products
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.establishments e
      where e.id = establishment_id
        and e.owner_id = auth.uid()
    )
  );

create policy "products_update_owner" on public.products
  for update to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      where e.id = establishment_id
        and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.establishments e
      where e.id = establishment_id
        and e.owner_id = auth.uid()
    )
  );

create policy "products_delete_owner" on public.products
  for delete to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      where e.id = establishment_id
        and e.owner_id = auth.uid()
    )
  );

-- FK pendiente de 1.2: ahora establishments ya existe.
alter table public.vendor_invites
  add constraint vendor_invites_establishment_id_fkey
  foreign key (establishment_id) references public.establishments (id);

-- Backfill de datos previos: no pisa un local que ya tiene dueño.
update public.establishments e
   set owner_id = vi.accepted_by
  from public.vendor_invites vi
 where vi.establishment_id = e.id
   and vi.accepted_at is not null
   and vi.accepted_by is not null
   and e.owner_id is null;

-- El trigger ahora puede asignar owner_id al aceptar la invitación.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(new.email);
  v_invite public.vendor_invites%rowtype;
begin
  select * into v_invite
    from public.vendor_invites
   where lower(email) = v_email
     and accepted_at is null
     and expires_at > now()
   limit 1;

  if found then
    insert into public.profiles (id, role, email, full_name)
    values (
      new.id,
      'vendor',
      v_email,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    );

    update public.vendor_invites
       set accepted_at = now(), accepted_by = new.id
     where id = v_invite.id;

    update public.establishments e
       set owner_id = new.id
     where e.id = v_invite.establishment_id
       and e.owner_id is null;
  elsif v_email like '%@uptc.edu.co' then
    insert into public.profiles (id, role, email, full_name)
    values (
      new.id,
      'student',
      v_email,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    );
  else
    raise exception 'email_domain_not_allowed' using errcode = 'P0001';
  end if;

  return new;
end $$;
