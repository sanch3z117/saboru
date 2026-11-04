-- Fase 7.1: persistir el consentimiento de la política de privacidad.
-- El registro envía los valores en raw_user_meta_data; el trigger los copia.
-- Docs: docs/03-ARQUITECTURA-Y-DATOS.md (profiles y handle_new_user).

alter table public.profiles
  add column privacy_accepted_at timestamptz,
  add column privacy_version text;

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
  elsif v_email like '%@uptc.edu.co' then
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
  else
    raise exception 'email_domain_not_allowed' using errcode = 'P0001';
  end if;

  return new;
end $$;
