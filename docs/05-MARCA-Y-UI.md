# SaborU — Marca y UI

> Fuente original: `GUIA_3_SaborU.md`, sección “LOGO Y LEMA DE LA ORGANIZACIÓN”. Este documento lleva esa identidad al código. Si hay conflicto, gana `AGENTS.md`; para datos y RLS, gana `docs/03`.

## Concepto: el “Pin-U”

El logo resume en un símbolo las tres preguntas del estudiante antes de comer: **¿dónde?, ¿qué? y ¿vale la pena?**

| Elemento | Cómo se dibuja | Qué significa |
|---|---|---|
| Pin de ubicación | Gota invertida: círculo arriba y punta redondeada abajo. Relleno amarillo con contorno carbón. | **¿Dónde?** La ubicación del establecimiento y la cercanía al bloque. |
| Letra “U” | U geométrica, sin serifas, trazo grueso y esquinas redondeadas, en carbón, dentro de una ventana crema. | **¿Qué?** La U de “universitario” y, por su curva, un plato, una taza o un tazón. |
| Estrella naranja | Estrella de cinco puntas con puntas redondeadas, en el hueco superior de la U, como servida en el plato. | **¿Vale la pena?** La calificación de la comunidad. Es lo que diferencia a SaborU de un mapa. |

El símbolo funciona a tamaños pequeños porque el pin se lee como “lugar” y la U con la estrella como “comida valorada”.

## Versiones y assets

| Versión | Uso | Archivo |
|---|---|---|
| Icono Pin-U | App, favicon, redes, sello | `docs/brand/logo-pin-u.svg` |
| Icono monocromo | Sellos, stickers, fotocopias, fondos de un color | `docs/brand/logo-pin-u-mono.svg` |
| Logotipo horizontal | Versión principal, cabecera, afiches | `docs/brand/logo-horizontal.svg` |
| Icono de aplicación | Manifest PWA y tiendas | `docs/brand/app-icon.svg` |

- **Horizontal:** Pin-U a la izquierda; “Sabor” en carbón SemiBold y “U” en naranja ExtraBold, 10 % más grande; lema debajo en Regular, cerca del 40 % del tamaño del nombre.
- **Vertical:** icono arriba, nombre en medio y lema abajo. Se usa en afiches y pantalla de carga.
- **Icono de app (1024 × 1024):** fondo amarillo liso, pin crema, U carbón y estrella naranja; sin texto. Las tiendas aplican las esquinas redondeadas.
- **Favicon/avatar:** solo el pin con la U; sin estrella en el tamaño más pequeño.
- **Tamaño mínimo:** icono de 24 px de alto en pantalla o 1 cm impreso; horizontal de 120 px de ancho.
- **Área de respeto:** margen libre equivalente a 2 × el grosor del trazo de la U.
- **Usos incorrectos:** cambiar colores, estirar o inclinar, reemplazar la estrella, ponerlo sobre fotos recargadas sin placa de fondo o sugerir afiliación oficial con la universidad.
- **Wordmark:** `logo-horizontal.svg` usa Poppins como referencia. En la app, la fuente se carga con `next/font`; si el logo se usa fuera de la app (imprenta, convenios), convertir el texto a curvas antes de enviarlo.
- **Vista previa:** abrir `docs/brand/preview.html` o mirar la captura `docs/brand/preview.png`.

## Paleta

| Color | HEX | Uso | Regla |
|---|---|---|---|
| Amarillo Campus | `#F5B800` | Fondo del icono, pin, destacados | Texto siempre en carbón. Nunca blanco sobre amarillo. |
| Naranja Antojo | `#F26B21` | Estrella, U del nombre, botones de acción | Texto en carbón; el blanco no alcanza contraste en texto pequeño. |
| Carbón | `#2B2B2B` | Textos, contornos, U del pin | Color principal de lectura. |
| Crema | `#FFF6E5` | Fondos y ventana del pin | Descansa la vista frente al amarillo. |
| Verde Verificado | `#2E9E6B` | Solo insignia “Reseña verificada” y mensajes de éxito | No usarlo como color decorativo. |

Proporción sugerida: **60 % crema/blanco, 30 % amarillo/carbón, 10 % naranja/verde**.

## Tipografía

- **Poppins** (SemiBold 600 y ExtraBold 800) para nombre, títulos y precios.
- **Inter** (400/500) para textos de interfaz y párrafos. Alternativa: Nunito Sans.
- Cargar con `next/font/google` para evitar parpadeo y peticiones externas en runtime.
- Escala base:
  - Hero: Poppins 800, 40–56 px, line-height 1.05.
  - H1: Poppins 600, 32–40 px.
  - H2: Poppins 600, 24–28 px.
  - Cuerpo: Inter 400/500, 16 px, line-height 1.6.
  - Etiquetas: Inter 500, 14 px.
  - Precio: Poppins 600, 18–20 px.
- Evitar etiquetas en mayúsculas sostenidas y acentos tipográficos de una sola palabra; la jerarquía se construye con tamaño, peso y espacio.

## Lema y descriptores

- **Lema:** “Antojo con criterio.”
  - “Antojo” = sabor, emoción, decisión espontánea.
  - “Criterio” = reseñas verificadas, presupuesto y cercanía.
- **Descriptor para tiendas:** “Descubre, compara y califica dónde comer en tu campus”.
- Alternativas si se cambia el tono: “Elige rico, gasta bien.” / “Tu campus tiene sabor.”

Antes de producción, verificar el nombre y el logo en la base de marcas de la SIC y registrar la marca después del lanzamiento.

## Tokens para Tailwind 4

En `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-campus: #f5b800;
  --color-antojo: #f26b21;
  --color-carbon: #2b2b2b;
  --color-cream: #fff6e5;
  --color-verified: #2e9e6b;
  --color-verified-soft: #e6f4ec;
  --color-verified-ink: #1f7a50;

  --font-display: "Poppins", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

  --radius-card: 0.75rem; /* 12 px */
  --radius-panel: 0.625rem; /* 10 px */
  --radius-pill: 9999px;

  /* Sombra dura de cartelera: offset sin blur */
  --shadow-hard: 4px 4px 0 0 #2b2b2b;
  --shadow-hard-sm: 2px 2px 0 0 #2b2b2b;
}
```

Uso esperado: `bg-cream`, `text-carbon`, `bg-campus`, `text-antojo`, `bg-verified`, `font-display`, `rounded-card`, `rounded-panel`, `shadow-hard`.

`verified-soft` y `verified-ink` son tintes accesibles derivados del verde para la insignia; no son colores nuevos de marca.

Los valores en JavaScript (SVG, marcadores del mapa, metadatos e imágenes generadas) viven en `src/lib/brand.ts`. No se escriben hex sueltos en componentes nuevos.

## Lenguaje visual: “Cartelera de campus” (Fase 7.5)

La app no es un tablero SaaS. Es la cartelera de comida del campus: papel crema, tinta carbón, resaltador amarillo, precio naranja y sello verde. El mapa es el escenario; la lista es la cartelera.

### Material y jerarquía

- **Borde:** 2 px de carbón en cards, paneles, inputs, botones y chips. Los separadores internos pueden ser de 1 px con `carbon/20`; no compiten con el borde principal.
- **Radios:** `12 px` en cards y fotos (`rounded-card`), `10 px` en paneles y fieldsets (`rounded-panel`), `pill` en botones y chips.
- **Sombra:** dura y con offset (`shadow-hard` de 4 px o `shadow-hard-sm` de 2 px). Nunca sombra difusa, glassmorphism ni `backdrop-blur`.
- **Fotos:** siempre con marco carbón de 2 px y esquinas de card. Si no hay foto, `PhotoPlaceholder` de marca; nunca una caja amarilla vacía.
- **Jerarquía:** una sola acción principal por bloque. El precio y el nombre mandan; la categoría y los metadatos acompañan. No se repite la misma card para todo.
- **Precio:** siempre visible, en Poppins SemiBold y formato COP sin decimales.
- **Buscador:** el presupuesto y la cercanía son los controles protagonistas; los filtros secundarios van como chips.
- **Fondos:** crema o amarillo con texto carbón. El naranja es acento de acción y precio; el verde solo para verificación y éxito.

### Primitivas (`src/components/ui/`)

| Primitiva | Uso | Regla |
|---|---|---|
| `Button` | Acción principal, secundaria, outline, ghost y link | `asChild` para renderizar un `Link`; primario naranja con borde carbón y sombra dura pequeña. |
| `Input`, `Textarea`, `Select` | Campos de formulario | Borde 2 px, radio card, foco visible; el error se comunica con texto, no solo con borde. |
| `Label` | Etiqueta de campo | Inter 500, 14 px; asociada con `htmlFor`. |
| `Badge` | “Destacado”, “Reseña verificada”, estado | Pill, sin mayúsculas; el verde solo en la insignia verificada. |
| `Chip` | Filtros y categorías | Pill con borde 2 px; `active` en amarillo y `quiet` para filtros secundarios. |
| `Card` | Ficha, panel, agrupación | Borde 2 px y radio 12 px; la sombra dura es opcional y marca selección o destacado. |
| `Alert` | Error, éxito, aviso, información | Icono + texto; `role="alert"` en error/aviso y `role="status"` en éxito/información. |
| `Skeleton` | Carga | Debe tener la forma real de la card o del mapa, no un bloque genérico. |
| `Dialog` / `Sheet` | Ficha rápida, filtros, bottom sheet móvil | Overlay carbón sin blur; bottom sheet con `safe-area-inset-bottom`; título accesible obligatorio. |

### Rating, marcador y símbolos

- **Estrella = rating.** El promedio se muestra con estrellas (llenas, medias y vacías) y siempre lleva el número y el conteo en texto para lectores de pantalla. No se muestra “4,3 / 5” como único formato.
- **Pin-U = marcador.** El marcador del mapa es el pin amarillo con la U; el seleccionado usa la sombra dura y escala. La estrella naranja dentro del pin no reemplaza el rating de la card.
- **“Destacado”** es una insignia amarilla y nunca cambia el orden del ranking.
- **“Reseña verificada”** es la única insignia verde, con icono de check.

### Mapa del campus

- **Superficie:** mapa con marco carbón de 2 px y alto fijo (sin CLS). Fondo crema, controles circulares con borde y sombra dura, atribución visible.
- **Marcadores:** Pin-U por local y etiquetas discretas de los bloques. El marcador seleccionado escala y sube de z-index; el punto del usuario es naranja con halo.
- **Popup:** tarjeta compacta con foto, nombre, categoría, estrella y conteo, distancia, “Desde $…” y “Ver ficha”. Cierra con botón “Cerrar” y clic en el mapa.
- **Controles:** acercar, alejar, centrar en el campus y “Usar mi ubicación”. Todos con nombre accesible y objetivo táctil de 44 px.
- **Fallback:** si no hay red o fallan las teselas, se retira el mapa y se muestra el aviso y la atribución; la lista de resultados sigue visible y “Reintentar” vuelve a montar el mapa.
- **Proveedor:** MapTiler Free con `NEXT_PUBLIC_MAPTILER_KEY`; sin clave, OpenStreetMap raster con atribución. Nunca se cachean teselas ni estilos.

### Descubrimiento map-first

- **Una superficie:** `/` y `/buscar` comparten búsqueda sticky, chips y resultados; la home añade un hero compacto, no un buscador distinto.
- **Buscador:** texto en plato, descripción, local o categoría; chips de categoría, presupuesto, “Abierto ahora” y orden; en móvil los chips hacen scroll horizontal.
- **Composición:** escritorio mapa 60% / lista 40%; tablet apilado; móvil mapa 46vh y lista debajo. La búsqueda queda sticky y no tapa el contenido.
- **Lista:** agrupada por local, con rating agregado, distancia, precio desde y productos coincidentes como filas simples. No se adelantan las cards con foto de 7.5.3.
- **Selección:** el marcador Pin-U selecciona el local y resalta su grupo; en móvil se abre un `Sheet` inferior con resumen y CTA “Ver ficha”. Cerrar devuelve el foco al mapa.
- **Rating:** el local usa el promedio de productos con al menos 5 reseñas; si no hay datos, “Sin reseñas suficientes” en lista y mapa.
- **Estados:** carga con skeletons, vacío con “Limpiar filtros”, error con reintento, permiso denegado con bloque por defecto, sin conexión con la lista en memoria y mapa retirado.

### Cartelera y fichas

- **Home editorial:** una card grande y dos secundarias en la banda de Destacados; no una cuadrícula de cards idénticas. “Cómo funciona” usa tres pasos numerados porque son una secuencia real.
- **Cards:** foto con marco, nombre, categoría, precio desde, distancia, estrellas, abierto/cerrado y CTA. “Destacado” es plan; “Activo” es estado. **“Verificado” no se usa para locales activos**, solo para reseñas verificadas o un flag real futuro.
- **Ficha de local:** foto principal, rating agregado, estado, distancia, mapa existente con un marcador, “Cómo llegar” (Google Maps/OSM), horario, productos con foto y reseñas.
- **Ficha de producto:** foto, precio grande, local, distancia, estrellas, criterios, “Guardar”, “Calificar”, formulario de estrellas y reseñas. Los campos, la validación y la recarga segura no cambian.
- **Estrellas:** `RatingStars` para lectura y `StarRatingInput` para los cinco criterios; siempre con valor y conteo en texto accesible. La insignia “Reseña verificada” lleva icono de check.
- **Favorito:** el servidor manda si está disponible; una operación offline solo gana si es posterior a la carga. La copia local se usa sin servidor.
- **OG:** `generateMetadata` y `opengraph-image` por local/producto, 1200×630, foto o fallback de marca, sin datos privados.

### Jerarquía del descubrimiento (7.5.6)

- **Un grupo por local:** cada resultado abre con una `EstablishmentCard` (foto, rating, distancia, precio desde, abierto/cerrado y CTA) y debajo un menú compacto de productos con nombre y precio. Los estados de reseñas y horario viven una sola vez en la cabecera del local, no en cada producto.
- **Primer plano:** el primer local con plan destacado se promueve al inicio del listado y usa la variante destacada; el resto usa la card compacta. Así las fotos aparecen en la primera pantalla del listado, no sólo en la banda editorial.
- **Escritorio:** mapa al 60 % y lista al 40 %. El mapa queda sticky bajo el header y la lista tiene scroll independiente; la página no necesita dos scrolls para recorrer los resultados.
- **Móvil:** mapa de 40vh al inicio y sheet para el marcador seleccionado; después, la lista fluye con el scroll de la página.
- **Header móvil:** navegación visible (Buscar), logo con más presencia, sesión discreta y menú para el resto de enlaces. El CTA de la ficha no compite con la navegación.
- **Cómo funciona y footer:** se apilan en una columna hasta `lg`; no se fuerzan tres columnas apretadas en móvil.

### Navegación y estados globales (7.5.4)

- **Header sticky:** fondo crema con borde carbón, logo, navegación de escritorio (Buscar, Privacidad), sesión siempre visible (“Entrar”/“Salir”) y menú móvil con Inicio, Buscar, Privacidad y Sin conexión. El menú cierra al navegar o con Escape y respeta foco visible.
- **Skip-link:** “Saltar al contenido” aparece al enfocar con teclado y apunta a `#contenido`; todo `main` lleva ese id.
- **Footer global:** logo, lema, enlaces a buscar, privacidad, catálogo sin conexión y entrar. No promete afiliación oficial con la universidad.
- **Auth:** panel lateral campus con logo y lema en escritorio; en móvil, logo arriba y formulario intacto. Sin cambios en la lógica de autenticación.
- **Offline y requiere conexión:** logo de marca. La pantalla de requiere conexión es HTML estático precacheable, sin datos de sesión ni botones de cuenta.
- **Error, 404 y carga:** mismo header/footer, mensaje claro, acción de reintento o vuelta al inicio, y skeletons con la forma real del contenido.
- **Barras de estado:** sincronización offline y actualización del service worker comparten una pila fija inferior; se apilan, nunca se superponen.

### Estados obligatorios

Toda pantalla nueva define: carga (skeleton con forma real), vacío (explica y ofrece una acción), error (mensaje claro + reintento), sin permiso de ubicación (aviso y centro del campus), sin conexión (sin mapa, distancia en texto), 404 y auth con la misma marca. El estado nunca se comunica solo con color.

### Movimiento

Solo para confirmar una acción (guardar, publicar, seleccionar marcador) o revelar el bottom sheet. Nada de animar la entrada de todas las cards. Todo respeta `prefers-reduced-motion`; el CSS global ya reduce animaciones y transiciones.

### No hacer

- Repetir la misma banda amarilla en home, búsqueda y ficha.
- Usar el “kit de tarjetas SaaS”: misma card redondeada, mismo borde suave y misma sombra gris para todo.
- Poner etiquetas en mayúsculas sostenidas sobre cada sección.
- Usar gradientes azul-violeta, glassmorphism o sombras difusas.
- Poner texto blanco sobre amarillo o naranja.
- Inventar colores, tipografías o variantes del logo.
- Dejar que el panel o el admin parezcan otra app: en 7.5 comparten header, tipografía, botones y estados (sin rediseño completo del back-office).

## Accesibilidad

- Carbón sobre crema y carbón sobre amarillo son las combinaciones seguras.
- No usar blanco sobre amarillo ni blanco sobre naranja en texto pequeño.
- Todo control debe tener foco visible y nombre accesible.
- El estado “sin conexión”, “pendiente de envío” y “publicada” se comunica con texto, no solo con color.
- Probar en móvil y con teclado.

## Fotos

- La UI pública resuelve toda foto con `photoSrc` (`src/lib/photos.ts`): acepta una ruta de Storage, una URL absoluta o un archivo de `public/`. Nunca se concatena el bucket a mano.
- En la base, `establishments.photos` y `products.photo_url` guardan rutas de Storage. La UI usa `next/image` cuando corresponda y siempre con marco de marca, `sizes` y texto alternativo útil (nombre del plato o del local, no “imagen”).
- Si no hay foto o falla la carga, se usa `PhotoPlaceholder`; no se deja un hueco roto.
- Las fotos demo son de Unsplash/Pexels con licencia, se convierten a WebP y se suben al bucket local con `npm run demo:photos` (local-only, `--dry-run`, nunca en CI/producción). Su crédito vive en `docs/demo/CREDITS.md` y se pueden reemplazar por fotos propias sin tocar el código.
- No usar fotos de restaurantes reales sin permiso ni sugerir que el local del seed es real.

## Checklist para la Fase 0 y la UI

- [ ] Copiar los SVG de `docs/brand/` a `public/brand/`.
- [ ] Usar `logo-pin-u.svg` como base del favicon (`src/app/icon.svg`).
- [ ] Generar los PNG 192, 512 y 1024 desde `app-icon.svg` para `manifest.ts`.
- [ ] Cargar Poppins e Inter con `next/font/google`.
- [ ] Declarar los tokens en `globals.css` con `@theme`.
- [ ] Verificar que el manifest tenga `name`, `short_name`, `start_url`, `display: standalone`, `theme_color` y los iconos.
- [ ] Usar las primitivas de `src/components/ui/` y los valores de `src/lib/brand.ts`; no reintroducir strings de estilo duplicados.
- [ ] Revisar carga, vacío, error, sin ubicación y sin conexión en cada pantalla nueva.
- [ ] Revisar 320, 375, 768, 1024 y 1440 px, foco visible, teclado y `prefers-reduced-motion`.
- [ ] No inventar colores, tipografías ni variantes del logo.
