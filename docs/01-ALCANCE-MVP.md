# SaborU — Alcance del MVP

> Documento corto de referencia. Si una funcionalidad no está aquí, no entra al MVP sin aprobación del equipo.

## Qué es

SaborU es una aplicación web instalable (PWA) **que funciona sin conexión** y ayuda a la comunidad universitaria a decidir qué comer en el campus. Reúne la oferta de casetas, cafeterías y restaurantes en un solo catálogo, permite comparar por presupuesto, cercanía al bloque y horario, y muestra calificaciones hechas por estudiantes con correo institucional verificado.

Para los establecimientos, SaborU es una vitrina digital y un panel con retroalimentación real de sus clientes, sin comisiones por pedido.

## Quiénes la usan

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Estudiante** | Estudiantes, docentes y administrativos con correo `@uptc.edu.co` | Buscar, filtrar, ver fichas, calificar, reportar reseñas y guardar favoritos (también sin conexión) |
| **Vendedor** | Casetas, cafeterías y restaurantes del campus y su entorno, invitados por un admin | Gestionar su ficha y sus productos, consultar su panel de estadísticas (requiere conexión) |
| **Admin** | Equipo SaborU | Moderar reseñas, aprobar o suspender establecimientos, invitar vendedores, asignar planes (requiere conexión) |

## Funciones esenciales del MVP

1. **Catálogo y fichas**
   - Establecimientos con nombre, descripción, ubicación, horario, fotos y categoría.
   - Productos con precio en COP, descripción, disponibilidad y foto.
   - Ficha pública de establecimiento y de producto.

2. **Buscador y filtros**
   - Búsqueda por texto en plato, descripción, local y categoría.
   - Presupuesto máximo (por ejemplo, "qué puedo comer con $10.000").
   - Cercanía desde la ubicación del usuario o desde un bloque del campus.
   - Abierto ahora según el horario.
   - Tipo de comida o categoría.
   - Filtros combinables, orden por cercanía/precio/rating y paginación.
   - Estado compartible en la URL (`q`, categoría, presupuesto, abierto, orden).
   - Mapa del campus con los locales y la ubicación del usuario (solo con conexión; la lista y la distancia en texto son la alternativa).
   - Funciona igual con y sin conexión para buscar y filtrar (se busca sobre una copia local del catálogo).

3. **Reseñas por criterios**
   - Cinco criterios de 1 a 5: sabor, cantidad, precio, presentación y relación calidad-precio.
   - Comentario escrito opcional.
   - Solo usuarios con correo institucional verificado.
   - Una reseña por usuario y producto cada 30 días.
   - Insignia "Reseña verificada" y opción de reportar.
   - Sin conexión, la reseña queda "Pendiente de envío" y se envía sola al volver la red.

4. **Panel del vendedor**
   - Edición de su ficha y de sus productos.
   - Promedio por criterio de cada producto.
   - Productos más consultados y horas de mayor consulta.
   - Comentarios recientes, siempre anónimos.
   - Comparación con el promedio del campus.
   - Lectura únicamente de datos agregados y anonimizados, con un mínimo de reseñas para mostrar un promedio.

5. **Funcionamiento sin conexión (offline-first)**
   - La app se instala y abre sin internet (app shell en caché).
   - Catálogo, buscador, fichas y reseñas recientes disponibles tras la primera visita con conexión.
   - Reseñas, favoritos y reportes hechos sin conexión se guardan en una cola local y se envían al recuperar la red.
   - Service worker robusto: actualización controlada, límites de almacenamiento, limpieza al cerrar sesión.
   - Especificación completa en `docs/04-OFFLINE-PWA.md`.

## Qué funciona sin conexión y qué no

| Función | Sin conexión |
|---|---|
| Abrir la app instalada | Sí |
| Buscar y filtrar el catálogo | Sí (con la copia local; se muestra la fecha de la última actualización) |
| Ver fichas de establecimientos y productos | Sí |
| Ver fotos | Las ya vistas, sí; las demás muestran una imagen de reemplazo |
| Escribir reseña, favorito o reporte | Sí, quedan pendientes y se envían al volver la red |
| Iniciar sesión, registrarse, recuperar acceso | No |
| Mapa interactivo | No (el mapa es solo con conexión; se muestra bloque y distancia en texto) |
| Panel del vendedor y panel admin | No |

## Fuera del MVP

- Pagos en línea, suscripciones automáticas y facturación.
- Domicilios, carrito o gestión de pedidos.
- Chat, notificaciones push y recomendaciones personalizadas.
- Aplicación nativa publicada en Google Play o App Store.
- Expansión a otras universidades o sedes.
- Panel financiero o contabilidad.
- Mapas descargables sin conexión.
- Edición offline de fichas por vendedores o moderación offline por admins.
- Detección automática de reseñas fraudulentas, programa de puntos y embajadores (se tratarán en fases posteriores).

## Reglas de negocio no negociables

- Solo un correo `@uptc.edu.co` puede registrarse como estudiante y publicar reseñas.
- Los vendedores solo se crean por invitación de un admin.
- El plan que pague un vendedor nunca altera calificaciones ni rankings. Lo patrocinado se marca como "Destacado".
- Una reseña por usuario y producto cada 30 días; se puede reportar y moderar. La hora que cuenta es la del servidor.
- Los precios se guardan como enteros en pesos colombianos (COP), sin decimales.
- Los datos personales se tratan según la Ley 1581 de 2012: minimización, consentimiento y política de privacidad visible.
- El vendedor solo ve estadísticas agregadas; nunca datos personales de quienes reseñan ni su identificador.
- Los datos privados nunca quedan en caché al cerrar sesión.

## Criterios de aceptación del MVP

El MVP se considera terminado cuando estos flujos funcionan de punta a punta y pasan en Playwright contra el build de producción:

1. Un estudiante se registra con correo institucional, busca por presupuesto y cercanía, abre una ficha y publica una reseña.
2. Un correo no institucional no puede registrarse como estudiante ni publicar reseñas.
3. Un vendedor inicia sesión, edita su ficha y consulta sus estadísticas.
4. Un admin oculta una reseña reportada y deja de verse en la ficha.
5. Un usuario sin sesión puede navegar el catálogo, pero no reseñar.
6. **Offline, lectura:** tras una visita con conexión, con la red cortada y la página recargada, el estudiante busca por presupuesto, abre una ficha y la ve completa.
7. **Offline, escritura:** sin conexión, el estudiante escribe una reseña, la ve "Pendiente de envío"; al volver la red se publica y aparece la insignia "Reseña verificada".
8. **Offline, privacidad:** al cerrar sesión se borran las cachés y datos privados locales, y el panel del vendedor muestra "requiere conexión" sin datos.
9. **Mapa, solo con conexión:** muestra los locales del campus y la ubicación del usuario con permiso; sin permiso cae al bloque por defecto o al centro del campus y sin teselas cae a la lista con distancias en texto.
10. **Descubrimiento compartible:** texto y chips actualizan mapa y lista sin recargar; recargar la URL conserva los filtros y el estado vacío ofrece limpiar filtros.

Además: la app es instalable (Lighthouse/DevTools) y se verificó a mano en un Android con Chrome y, si es posible, en un iPhone con Safari.

## Métricas de éxito del MVP

- 20 establecimientos y 200 productos cargados al final del primer año.
- 1.000 reseñas verificadas al final del segundo año.
- 35 % de los estudiantes activos de la sede usando la plataforma al tercer año.
- Búsqueda con resultados en menos de 1 segundo una vez cargado el catálogo local; primera carga menor a 3 segundos en 4G.
- Disponibilidad del servicio de al menos 99 %.
- Tras la primera visita, la app abre sin conexión en menos de 2 segundos.

## Decisiones abiertas

- Dominio institucional exacto: se asume `@uptc.edu.co`; confirmar con la universidad.
- Bloques del campus y coordenadas: se cargarán en el seed inicial y se validarán en campo.
- Nombre legal y dominio web definitivos.
- Mínimo de reseñas para mostrar promedios al vendedor: se propone 5; confirmar.
- Proveedor de límite de peticiones: se propone Upstash (plan gratuito); confirmar.
- Cuota de MapTiler Free en producción: confirmar antes del despliegue (proveedor decidido en `docs/06`; OSM es el fallback).
