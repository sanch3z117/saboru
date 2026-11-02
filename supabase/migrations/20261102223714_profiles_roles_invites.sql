-- 1.2 Perfiles, roles, invitaciones y dominio institucional.
-- Docs: docs/03-ARQUITECTURA-Y-DATOS.md (profiles, vendor_invites, funciones y trigger).

create type public.user_role as enum ('student', 'vendor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null default '',
  email text not null,
  created_at timestamptz not null default now(),
  constraint profiles_email_lowercase check (email = lower(email)),
  constraint profiles_email_key unique (email)
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- `search_path = ''` obliga a calificar todo (auth.users, public.profiles).
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- La fuente de verdad del dominio es auth.users, no profiles.email.
create function public.is_institutional_student() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid()
      and p.role = 'student'
      and u.email_confirmed_at is not null
      and lower(u.email) like '%@uptc.edu.co'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_institutional_student() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_institutional_student() to authenticated;

create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sin INSERT ni DELETE para clientes: el perfil lo crea el trigger.

create table public.vendor_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Pendiente 1.3: agregar la FK a public.establishments (id).
  establishment_id uuid not null,
  invited_by uuid not null references public.profiles (id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint vendor_invites_email_lowercase check (email = lower(email))
);

-- Una sola invitación abierta por correo.
create unique index vendor_invites_open_email_key
  on public.vendor_invites (lower(email))
  where accepted_at is null;

alter table public.vendor_invites enable row level security;

revoke all on public.vendor_invites from anon, authenticated;
grant select, insert, update on public.vendor_invites to authenticated;

create policy "vendor_invites_admin_select" on public.vendor_invites
  for select to authenticated
  using (public.is_admin());

create policy "vendor_invites_admin_insert" on public.vendor_invites
  for insert to authenticated
  with check (public.is_admin());

create policy "vendor_invites_admin_update" on public.vendor_invites
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create function public.handle_new_user() returns trigger
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

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
