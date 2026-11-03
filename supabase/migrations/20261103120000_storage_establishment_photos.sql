-- Fase 5: fotos de establecimientos en Supabase Storage.
-- Lectura pública del bucket; escritura solo dentro de `{establishment_id}/...`
-- cuando el establecimiento pertenece al usuario autenticado.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'establishment-photos',
  'establishment-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Extrae el uuid del primer segmento de la ruta sin fallar si no lo es.
-- La ruta válida es `{establishment_id}/{uuid}.{ext}`.
create function public.photo_establishment_id(object_name text)
returns uuid
language sql stable set search_path = '' as $$
  select case
    when (storage.foldername(object_name))[1] ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(object_name))[1])::uuid
    else null
  end;
$$;

revoke execute on function public.photo_establishment_id(text) from public, anon;
grant execute on function public.photo_establishment_id(text) to authenticated;

-- Lectura pública: el bucket es público y no expone datos de la sesión.
create policy "establishment_photos_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'establishment-photos');

create policy "establishment_photos_insert_owner" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'establishment-photos'
    and exists (
      select 1
      from public.establishments e
      where e.id = public.photo_establishment_id(objects.name)
        and e.owner_id = auth.uid()
    )
  );

create policy "establishment_photos_update_owner" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'establishment-photos'
    and exists (
      select 1
      from public.establishments e
      where e.id = public.photo_establishment_id(objects.name)
        and e.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'establishment-photos'
    and exists (
      select 1
      from public.establishments e
      where e.id = public.photo_establishment_id(objects.name)
        and e.owner_id = auth.uid()
    )
  );

create policy "establishment_photos_delete_owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'establishment-photos'
    and exists (
      select 1
      from public.establishments e
      where e.id = public.photo_establishment_id(objects.name)
        and e.owner_id = auth.uid()
    )
  );
