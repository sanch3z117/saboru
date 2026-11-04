-- Fase 8.1: cuentas demo externas.
-- El servidor agrega el correo a una allowlist de un solo uso cuando
-- DEMO_ALLOW_ANY_EMAIL está activo. Solo el service role puede escribirla y
-- las filas caducan a los 15 minutos. La regla institucional sigue siendo la
-- predeterminada; las reseñas y favoritos siguen exigiendo @uptc.edu.co.
-- Docs: docs/03-ARQUITECTURA-Y-DATOS.md, docs/06-DECISIONES-PASO-0.md y
-- docs/07-DESPLIEGUE.md.

create table public.demo_email_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.demo_email_allowlist enable row level security;
revoke all on table public.demo_email_allowlist from public, anon, authenticated;
grant all on table public.demo_email_allowlist to service_role;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(new.email);
  v_invite public.vendor_invites%rowtype;
  v_privacy_accepted_at timestamptz :=
    nullif(new.raw_user_meta_data->>'privacy_accepted_at', '')::timestamptz;
  v_privacy_version text :=
    nullif(new.raw_user_meta_data->>'privacy_version', '');
begin
  select * into v_invite
    from public.vendor_invites
   where lower(email) = v_email
     and accepted_at is null
     and expires_at > now()
   limit 1;

  if found then
    insert into public.profiles (
      id,
      role,
      email,
      full_name,
      privacy_accepted_at,
      privacy_version
    )
    values (
      new.id,
      'vendor',
      v_email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      v_privacy_accepted_at,
      v_privacy_version
    );

    update public.vendor_invites
       set accepted_at = now(), accepted_by = new.id
     where id = v_invite.id;

    update public.establishments e
       set owner_id = new.id
     where e.id = v_invite.establishment_id
       and e.owner_id is null;
  elsif v_email like '%@uptc.edu.co'
     or exists (
       select 1
         from public.demo_email_allowlist a
        where a.email = v_email
          and a.created_at > now() - interval '15 minutes'
     ) then
    insert into public.profiles (
      id,
      role,
      email,
      full_name,
      privacy_accepted_at,
      privacy_version
    )
    values (
      new.id,
      'student',
      v_email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      v_privacy_accepted_at,
      v_privacy_version
    );

    delete from public.demo_email_allowlist where email = v_email;
  else
    raise exception 'email_domain_not_allowed' using errcode = 'P0001';
  end if;

  return new;
end $$;
