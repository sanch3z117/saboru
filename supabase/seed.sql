-- Seed de los 6 bloques aproximados del campus (docs/06-DECISIONES-PASO-0.md).
-- st_point recibe longitud primero y latitud después.
-- UUID fijos para que el seed sea reproducible.

insert into public.campus_blocks (id, name, location) values
  (
    '00000000-0000-4000-8000-000000000001',
    'Bloque Central',
    extensions.st_point(-73.3567, 5.5520)::extensions.geography
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Bloque de Ingenierías',
    extensions.st_point(-73.3561, 5.5526)::extensions.geography
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Bloque de Laboratorios',
    extensions.st_point(-73.3572, 5.5516)::extensions.geography
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'Biblioteca',
    extensions.st_point(-73.3569, 5.5528)::extensions.geography
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'Bloque Administrativo',
    extensions.st_point(-73.3563, 5.5512)::extensions.geography
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'Cafetería Central',
    extensions.st_point(-73.3559, 5.5522)::extensions.geography
  )
on conflict (id) do nothing;
