# SaborU — Decisiones del Paso 0

> Cerradas el **2026-11-02**. Desbloquean la Fase 1. Si alguna cambia, actualizar este documento y `docs/02-PLAN-MVP.md`.

## Resumen

| # | Decisión | Elegido | Por qué |
|---|---|---|---|
| 1 | Dominio institucional | `@uptc.edu.co` | Es el dominio oficial de la UPTC y permite verificar reseñas sin pedir correos personales. |
| 2 | Supabase | Plan Free + PostGIS en `extensions` | Alcanza para el MVP y no cuesta; PostGIS está disponible en Free. |
| 3 | Mínimo de reseñas | 5 por producto y 5 por establecimiento | Equilibrio entre estabilidad estadística y adopción temprana. |
| 4 | Rate limit | Upstash Ratelimit Free | Serverless sin memoria compartida; el plan gratuito sobra para el campus. |
| 5 | Teselas del mapa | MapTiler Free | Integración directa con MapLibre y cuota gratuita suficiente para el MVP. |
| 6 | Nombre y dominio | SaborU S.A.S. · `saboru.app` (+ `saboru.com.co`) | `.app` es corto y HTTPS obligatorio; `.com.co` da confianza local. |
| 7 | Bloques del campus | 6 bloques aproximados, validar en campo | Suficiente para probar “cerca de mi bloque” sin fingir precisión. |

---

## 1. Dominio institucional: `@uptc.edu.co`

- **Decisión:** solo los correos `@uptc.edu.co` pueden registrarse como estudiantes y publicar reseñas.
- **Implementación:** una constante `ALLOWED_STUDENT_DOMAINS = ["uptc.edu.co"]`; validar en la UI y, sobre todo, en `handle_new_user()` y en `is_institutional_student()` contra `auth.users`.
- **Por qué:** es el dominio oficial de la universidad, reduce reseñas falsas y evita pedir datos personales. Si la universidad usa un subdominio o alias, se agrega a la lista.
- **Consecuencia:** un correo personal puede navegar el catálogo, pero no reseñar. El mensaje de error debe decir “Usa tu correo institucional UPTC”.

## 2. Supabase: plan Free con PostGIS en `extensions`

- **Decisión:** plan Free para desarrollo y MVP; PostGIS habilitado en el schema `extensions`.
- **Límites del plan Free:** 2 proyectos activos, 500 MB de base de datos, 1 GB de Storage, 50.000 usuarios activos mensuales, 5 GB de egress y API sin límite de requests. El proyecto se pausa tras aproximadamente una semana de inactividad.
- **Por qué:** con 20 establecimientos, 200 productos y 1.000 reseñas el MVP queda muy por debajo de los límites. Para fotos, 1 GB alcanza si se comprimen a WebP y se limita el tamaño.
- **Mitigación de la pausa:** programar un ping semanal o pasar a Pro ($25/mes) el mes de la sustentación. Pro también da backups diarios y evita la pausa.
- **Consecuencia técnica:** en migraciones y RPC usar `extensions.geography`, `extensions.st_point`, `extensions.st_distance` y `extensions.st_dwithin`. Las funciones `security definer` con `search_path = ''` deben calificar el schema.
- **Por qué en `extensions`:** Supabase recomienda no instalar PostGIS en `public`; si queda ahí, el Security Advisor marca `public.spatial_ref_sys` y expone objetos que no son datos de la app.

## 3. Mínimo de reseñas: 5

- **Decisión:** mostrar promedios de un producto solo cuando tenga **5 reseñas publicadas**; mostrar agregados y comentarios de un establecimiento solo cuando tenga **5 reseñas publicadas**.
- **Por qué 5 y no 3 o 10:**
  - Con **3**, una sola reseña pesa 33 % del promedio y el dato es demasiado volátil; además, es más fácil inferir a quién pertenece una reseña.
  - Con **10**, casi ningún producto tendría datos durante los primeros meses y el panel del vendedor nacería vacío.
  - **5** es el punto medio: una reseña pesa 20 %, el vendedor empieza a ver señal y se protege la privacidad.
- **Implementación:** `min_reviews_for_stats()` con valor fijo **5** (hard-code). No usar un GUC de sesión: un cliente con acceso directo podría bajarlo y romper el umbral de privacidad. Solo cuentan reseñas `published`; las ocultas y pendientes no suman. El vendedor nunca recibe `user_id`.
- **UI:** si un producto no llega al mínimo, mostrar “Aún no hay suficientes reseñas” en lugar de un promedio engañoso.

## 4. Rate limit: Upstash Ratelimit Free

- **Decisión:** Upstash Ratelimit en el plan Free.
- **Límites free:** alrededor de 500.000 comandos al mes y 250 MB de datos.
- **Reglas iniciales:** reseñas 10/hora por usuario, reportes 20/hora por usuario, `/api/sync` 20 lotes/hora por usuario y registro de vistas/búsquedas 60/min por IP. Valores ajustables con datos reales.
- **Por qué:** Vercel es serverless y no tiene memoria compartida confiable; Upstash es el camino estándar y el plan Free alcanza para un campus. Si se agota, se degradan los límites, no la lectura del catálogo.

## 5. Teselas del mapa: MapTiler Free

- **Decisión:** MapTiler Cloud en el plan Free, con MapLibre GL y atribución visible.
- **Límites free:** 100.000 requests de API al mes, 5.000 sesiones de mapa al mes y 5 estilos.
- **Por qué:** integración directa con MapLibre, sin montar infraestructura, y la cuota alcanza para el MVP. El mapa solo se usa en la búsqueda y la ficha; no en el offline.
- **Fallback:** si el mapa falla o se agota la cuota, mostrar bloque y distancia en texto. El mapa es una mejora, no un requisito para decidir.
- **Alternativa futura:** Protomaps/PMTiles autohospedado si el uso crece o se quiere eliminar la dependencia.

## 6. Nombre legal y dominio web

- **Razón social:** `SaborU S.A.S.` (sigla S.U.).
- **Dominio principal:** `saboru.app`; **defensivo:** `saboru.com.co`.
- **`saboru.com` está tomado** (resuelve a una IP); no usarlo.
- **Verificación:** `saboru.app`, `saboru.com.co` y `saboru.co` no tenían registro A en la consulta DNS, lo que sugiere disponibilidad, pero **no lo garantiza**. Confirmar disponibilidad y precio en un registrador antes de comprar.
- **Correo:** `hola@saboru.app`.
- **Por qué:** `.app` es corto, moderno y obliga HTTPS; `.com.co` transmite confianza local y sirve como respaldo.
- **Pendiente:** búsqueda fonética y registro de marca en la SIC antes de producción.

## 7. Bloques del campus

- **Centro de referencia:** `5.5520095, -73.3566646` (Avenida Central del Norte 39-115, Tunja).
- **Seed inicial:** 6 bloques aproximados, suficientes para probar el filtro “cerca de mi bloque”.

| Bloque | Latitud | Longitud |
|---|---|---|
| Bloque Central | 5.5520 | -73.3567 |
| Bloque de Ingenierías | 5.5526 | -73.3561 |
| Bloque de Laboratorios | 5.5516 | -73.3572 |
| Biblioteca | 5.5528 | -73.3569 |
| Bloque Administrativo | 5.5512 | -73.3563 |
| Cafetería Central | 5.5522 | -73.3559 |

- **Por qué:** 6 bloques bastan para validar la búsqueda por cercanía y el seed; no se finge precisión.
- **Validación:** recorrer el campus y corregir las coordenadas en el seed antes del lanzamiento. No hace falta cambiar el esquema.

---

## Consecuencias para la Fase 1

- **1.1:** habilitar PostGIS en `extensions` y crear la migración con `extensions.geography`.
- **1.2:** `@uptc.edu.co` en el trigger y en la UI.
- **1.3:** seed de los 6 bloques.
- **1.4 y 1.7:** `min_reviews_for_stats()` con valor 5.
- **3 y 4:** Upstash para rate limit.
- **3:** MapTiler para las teselas.
- **Antes de producción:** confirmar dominio, validar coordenadas y registrar la marca.
