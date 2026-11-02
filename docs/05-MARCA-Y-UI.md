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

  --radius-card: 1rem;
  --radius-pill: 9999px;
}
```

Uso esperado: `bg-cream`, `text-carbon`, `bg-campus`, `text-antojo`, `bg-verified`, `font-display`.

`verified-soft` y `verified-ink` son tintes accesibles derivados del verde para la insignia; no son colores nuevos de marca.

## Reglas de componentes

- **Botón primario:** `bg-antojo text-carbon`, peso 600, radio `pill` o `card`; hover con `brightness-95`, nunca cambiando a un color fuera de la paleta.
- **Botón secundario:** `bg-cream text-carbon` con borde carbón; foco visible de 2 px.
- **Insignia “Reseña verificada”:** `bg-verified-soft text-verified-ink` con icono verde; no usar el verde como fondo de texto pequeño.
- **Insignia “Destacado”:** fondo amarillo, texto carbón. Nunca altera el orden del ranking.
- **Precio:** siempre visible y en Poppins SemiBold; formato COP sin decimales.
- **Buscador:** el presupuesto y la cercanía son los controles protagonistas; los filtros secundarios van como chips.
- **Evitar** el “kit de tarjetas SaaS”: no usar la misma tarjeta redondeada, el mismo borde y la misma sombra para todo. La jerarquía se marca con tipografía, espacio y una sola acción principal.
- **Movimiento:** solo para confirmar acciones (publicar, enviar, actualizar); respetar `prefers-reduced-motion`.

## Accesibilidad

- Carbón sobre crema y carbón sobre amarillo son las combinaciones seguras.
- No usar blanco sobre amarillo ni blanco sobre naranja en texto pequeño.
- Todo control debe tener foco visible y nombre accesible.
- El estado “sin conexión”, “pendiente de envío” y “publicada” se comunica con texto, no solo con color.
- Probar en móvil y con teclado.

## Checklist para la Fase 0 y la UI

- [ ] Copiar los SVG de `docs/brand/` a `public/brand/`.
- [ ] Usar `logo-pin-u.svg` como base del favicon (`src/app/icon.svg`).
- [ ] Generar los PNG 192, 512 y 1024 desde `app-icon.svg` para `manifest.ts`.
- [ ] Cargar Poppins e Inter con `next/font/google`.
- [ ] Declarar los tokens en `globals.css` con `@theme`.
- [ ] Verificar que el manifest tenga `name`, `short_name`, `start_url`, `display: standalone`, `theme_color` y los iconos.
- [ ] Revisar contraste y foco visible antes de cerrar la fase.
- [ ] No inventar colores, tipografías ni variantes del logo.
