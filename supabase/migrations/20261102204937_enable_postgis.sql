-- 1.1 PostGIS en el schema `extensions` (docs/03, docs/06).
-- Supabase recomienda no instalar PostGIS en `public`: expondría
-- spatial_ref_sys y otros objetos ajenos a los datos de la app.

create schema if not exists extensions;

create extension if not exists postgis with schema extensions;

-- Los roles de la app y el Data API deben poder usar tipos y funciones
-- del schema (p. ej. extensions.geography, extensions.st_dwithin).
grant usage on schema extensions to anon, authenticated, service_role;
