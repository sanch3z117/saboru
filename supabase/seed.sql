-- Seed ficticio y reproducible (docs/02, Fase 1.8).
-- Los 6 bloques vienen de 1.3; aquí se agregan 7 establecimientos y 24 productos.
-- st_point recibe longitud primero y latitud después.
-- UUID fijos + on conflict para que el seed sea idempotente.
-- Sin datos personales ni fotos reales.

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

insert into public.establishments (
  id,
  owner_id,
  name,
  slug,
  description,
  address,
  location,
  schedule,
  category,
  photos,
  status,
  plan
) values
  (
    '10000000-0000-4000-8000-000000000001',
    null,
    'Comedor La Cosecha',
    'seed-comedor-la-cosecha',
    'Almuerzos caseros de lunes a viernes.',
    'Campus UPTC, zona central',
    extensions.st_point(-73.3567, 5.5520)::extensions.geography,
    '{"mon":[["07:00","17:00"]],"tue":[["07:00","17:00"]],"wed":[["07:00","17:00"]],"thu":[["07:00","17:00"]],"fri":[["07:00","16:00"]],"sat":[],"sun":[]}'::jsonb,
    'almuerzos',
    '{}'::text[],
    'active',
    'basic'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    null,
    'Arepas del Bloque',
    'seed-arepas-del-bloque',
    'Arepas y fritos recién hechos.',
    'Campus UPTC, junto a Ingenierías',
    extensions.st_point(-73.3562, 5.5525)::extensions.geography,
    '{"mon":[["08:00","18:00"]],"tue":[["08:00","18:00"]],"wed":[["08:00","18:00"]],"thu":[["08:00","18:00"]],"fri":[["08:00","17:00"]],"sat":[["08:00","13:00"]],"sun":[]}'::jsonb,
    'fritos',
    '{}'::text[],
    'active',
    'featured'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    null,
    'Café Biblioteca',
    'seed-cafe-biblioteca',
    'Café y bebidas calientes para estudiar.',
    'Campus UPTC, entrada de la Biblioteca',
    extensions.st_point(-73.3569, 5.5527)::extensions.geography,
    '{"mon":[["07:00","19:00"]],"tue":[["07:00","19:00"]],"wed":[["07:00","19:00"]],"thu":[["07:00","19:00"]],"fri":[["07:00","18:00"]],"sat":[],"sun":[]}'::jsonb,
    'bebidas',
    '{}'::text[],
    'active',
    'pro'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    null,
    'Parrilla Central',
    'seed-parrilla-central',
    'Carnes y bandejas para almuerzo.',
    'Campus UPTC, costado del Bloque Central',
    extensions.st_point(-73.3565, 5.5518)::extensions.geography,
    '{"mon":[["11:00","16:00"]],"tue":[["11:00","16:00"]],"wed":[["11:00","16:00"]],"thu":[["11:00","16:00"]],"fri":[["11:00","15:00"]],"sat":[],"sun":[]}'::jsonb,
    'almuerzos',
    '{}'::text[],
    'active',
    'basic'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    null,
    'Jugos y Frutas',
    'seed-jugos-y-frutas',
    'Jugos naturales y postres de fruta.',
    'Campus UPTC, pasillo central',
    extensions.st_point(-73.3560, 5.5523)::extensions.geography,
    '{"mon":[["08:00","17:00"]],"tue":[["08:00","17:00"]],"wed":[["08:00","17:00"]],"thu":[["08:00","17:00"]],"fri":[["08:00","16:00"]],"sat":[],"sun":[]}'::jsonb,
    'bebidas',
    '{}'::text[],
    'active',
    'featured'
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    null,
    'Panadería Laboratorios',
    'seed-panaderia-laboratorios',
    'Panadería y postres de la mañana.',
    'Campus UPTC, junto a Laboratorios',
    extensions.st_point(-73.3571, 5.5517)::extensions.geography,
    '{"mon":[["06:30","15:00"]],"tue":[["06:30","15:00"]],"wed":[["06:30","15:00"]],"thu":[["06:30","15:00"]],"fri":[["06:30","14:00"]],"sat":[],"sun":[]}'::jsonb,
    'panaderia',
    '{}'::text[],
    'active',
    'basic'
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    null,
    'Food Truck Administrativo',
    'seed-food-truck-administrativo',
    'Comida rápida para el descanso.',
    'Campus UPTC, frente al Bloque Administrativo',
    extensions.st_point(-73.3564, 5.5513)::extensions.geography,
    '{"mon":[["10:00","18:00"]],"tue":[["10:00","18:00"]],"wed":[["10:00","18:00"]],"thu":[["10:00","18:00"]],"fri":[["10:00","17:00"]],"sat":[],"sun":[]}'::jsonb,
    'comidas rapidas',
    '{}'::text[],
    'active',
    'pro'
  )
on conflict (id) do nothing;

insert into public.products (
  id,
  establishment_id,
  name,
  description,
  price_cop,
  category,
  photo_url,
  available,
  allergens
) values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Almuerzo del día',
    'Sopa, seco y jugo.',
    10000,
    'almuerzos',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Almuerzo ejecutivo',
    'Sopa, seco, postre y jugo.',
    13000,
    'almuerzos',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Sopa del día',
    'Sopa casera con arepa.',
    5000,
    'almuerzos',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    'Arepa de queso',
    'Arepa asada con queso.',
    3500,
    'fritos',
    null,
    true,
    ARRAY['lacteos']
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000002',
    'Arepa rellena',
    'Arepa con carne y queso.',
    6000,
    'fritos',
    null,
    true,
    ARRAY['lacteos']
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000002',
    'Empanada',
    'Empanada de carne.',
    2500,
    'fritos',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000003',
    'Café americano',
    'Café negro de 8 oz.',
    3000,
    'bebidas',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000003',
    'Capuchino',
    'Café con leche espumada.',
    4500,
    'bebidas',
    null,
    true,
    ARRAY['lacteos']
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000003',
    'Chocolate caliente',
    'Chocolate con leche.',
    3500,
    'bebidas',
    null,
    true,
    ARRAY['lacteos']
  ),
  (
    '20000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000004',
    'Bandeja parrilla',
    'Carne, arroz, papas y ensalada.',
    15000,
    'almuerzos',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000004',
    'Churrasco',
    'Churrasco con papas.',
    14000,
    'almuerzos',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000004',
    'Papas a la francesa',
    'Porción de papas.',
    4000,
    'fritos',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000013',
    '10000000-0000-4000-8000-000000000005',
    'Jugo natural',
    'Jugo de fruta de temporada.',
    4000,
    'bebidas',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000014',
    '10000000-0000-4000-8000-000000000005',
    'Ensalada de frutas',
    'Frutas picadas con yogurt.',
    6000,
    'postres',
    null,
    true,
    ARRAY['lacteos']
  ),
  (
    '20000000-0000-4000-8000-000000000015',
    '10000000-0000-4000-8000-000000000005',
    'Limonada',
    'Limonada natural.',
    3000,
    'bebidas',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000016',
    '10000000-0000-4000-8000-000000000006',
    'Pan de queso',
    'Pan de queso recién horneado.',
    2000,
    'panaderia',
    null,
    true,
    ARRAY['gluten', 'lacteos']
  ),
  (
    '20000000-0000-4000-8000-000000000017',
    '10000000-0000-4000-8000-000000000006',
    'Croissant',
    'Croissant de mantequilla.',
    3500,
    'panaderia',
    null,
    true,
    ARRAY['gluten', 'lacteos']
  ),
  (
    '20000000-0000-4000-8000-000000000018',
    '10000000-0000-4000-8000-000000000006',
    'Torta de zanahoria',
    'Porción de torta.',
    4500,
    'postres',
    null,
    true,
    ARRAY['gluten', 'lacteos']
  ),
  (
    '20000000-0000-4000-8000-000000000019',
    '10000000-0000-4000-8000-000000000006',
    'Galleta de avena',
    'Galleta de avena y panela.',
    1500,
    'panaderia',
    null,
    true,
    ARRAY['gluten']
  ),
  (
    '20000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000007',
    'Hamburguesa',
    'Hamburguesa con papas.',
    12000,
    'comidas rapidas',
    null,
    true,
    ARRAY['gluten']
  ),
  (
    '20000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000007',
    'Perro caliente',
    'Perro caliente con papas.',
    7000,
    'comidas rapidas',
    null,
    true,
    ARRAY['gluten']
  ),
  (
    '20000000-0000-4000-8000-000000000022',
    '10000000-0000-4000-8000-000000000007',
    'Salchipapa',
    'Salchicha con papas.',
    9000,
    'comidas rapidas',
    null,
    true,
    '{}'::text[]
  ),
  (
    '20000000-0000-4000-8000-000000000023',
    '10000000-0000-4000-8000-000000000007',
    'Wrap de pollo',
    'Wrap con pollo y vegetales.',
    11000,
    'comidas rapidas',
    null,
    true,
    ARRAY['gluten']
  ),
  (
    '20000000-0000-4000-8000-000000000024',
    '10000000-0000-4000-8000-000000000007',
    'Malteada',
    'Malteada de vainilla.',
    6500,
    'bebidas',
    null,
    false,
    ARRAY['lacteos']
  )
on conflict (id) do nothing;
