---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.
license: Complete terms in LICENSE.txt
compatibility: opencode
metadata:
  project: saboru
---

# Frontend Design

> **Skill local de SaborU.** Es obligatoria para cualquier pantalla o componente visual del proyecto. La dirección de marca está fijada en `docs/05-MARCA-Y-UI.md` y el alcance en `docs/01-ALCANCE-MVP.md`; si esta skill y esos documentos chocan, ganan ellos.

## SaborU — dirección “Cartelera de campus”

No es una app SaaS con tarjetas genéricas. Es la cartelera de comida del campus: papel crema, tinta carbón, resaltador amarillo, precio naranja y sello verde. El mapa es el escenario; la lista es la cartelera.

- **Paleta (60/30/10):** `#FFF6E5` crema, `#2B2B2B` carbón, `#F5B800` amarillo, `#F26B21` naranja, `#2E9E6B` verde verificado. El naranja es acento real, no decoración.
- **Tipografía:** Poppins 800 para titulares, precios y marcadores; Inter 400/500 para interfaz y cuerpo. Sin mayúsculas sostenidas ni etiquetas decorativas sobre cada sección.
- **Lenguaje material:** borde carbón de 2 px, esquinas de 10–12 px en cards y paneles, chips y botones tipo pill, sombra dura offset (sin blur), fotos con marco. Nada de glassmorphism, gradientes azul-violeta ni el kit de cards idénticas con sombra difusa.
- **Símbolos:** el Pin-U es el marcador del mapa y la estrella es el rating. Cada card responde “¿Dónde? ¿Qué? ¿Vale la pena?” con distancia, precio y estrella. Lo patrocinado se marca “Destacado”, nunca se mezcla en el ranking.
- **Composición:** mapa + búsqueda + filtros + lista + ficha reversible. En móvil, mapa 45–50vh y bottom sheet; en escritorio, mapa 60% / lista 40%. La lista es la alternativa accesible del mapa.
- **Estados obligatorios:** carga con skeleton de la forma real; vacío con una acción; error con reintento; sin permiso de ubicación con aviso; sin conexión sin mapa y con distancia en texto; 404 y auth con la misma marca.
- **Accesibilidad:** contraste AA, foco visible de 2 px, navegación por teclado, nombres accesibles, objetivos táctiles de 44 px, estado comunicado con texto además de color y `prefers-reduced-motion` respetado.
- **Responsive:** revisar 320, 375, 768, 1024 y 1440 px. No dejar barras `fixed bottom-0` superpuestas; usar `safe-area-inset-bottom` en el bottom sheet móvil.
- **Movimiento:** solo para confirmar una acción o revelar el marcador seleccionado. No animar la entrada de todas las cards.
- **Prohibido:** inventar colores, tipografías o variantes del logo; usar `any`; crear una card para todo; repetir la misma banda amarilla en tres pantallas; poner texto blanco sobre amarillo o naranja.

## Proceso para SaborU

1. Lee `AGENTS.md`, `docs/05` y la sección de alcance que aplique.
2. Propón en 5 líneas tokens (color, tipo, radios, sombra), layout y el elemento memorable; espera aprobación si el paso lo exige.
3. Usa `src/lib/brand.ts` y las primitivas de `src/components/ui/`; no reintroduzcas strings de estilo duplicados.
4. Revisa el render real en navegador a 390 px y 1440 px antes de declarar terminado.

---

## Base general de la skill

Approach this as the design lead at a design studio known for giving every client a distinct visual identity that is not mistaken for anyone else's. This client has already rejected proposals that felt cliché or templated, and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take aesthetic risk if justified.

## Ground your designs in the subject matter

If the brief does not identify what the product or subject matter is, identify it yourself before designing, and confirm with the client. You can come up with one concrete subject, the design's audience, and the design's primary job, as a proposal. If there's any information in your memory about the client's preferences or context about what they're building, use that as a hint. The subject's industry, subject matter, materials, and vernacular are where distinctive visual choices come from — a design for a toy for girls aged 8–11 will be very aesthetically different from a dashboard for financial analysts. Build with the brief's real content and subject matter throughout.

## Design principles

For web designs, the hero is the first thing viewers will see. Open with the most characteristic thing in the subject's world, in the form that is most appropriate: a headline, an image, an animation, a live demo, an interactive moment, or other treatments. Be deliberate with your choice: a big number with a small label, supporting stats, and a gradient accent is the default treatment, so only use it if that's truly the best option.

Typography carries the personality of the page. You don't need a different typeface for display or headline text and body content: use one family or two, and if two, make them clearly distinct.

Choose your typefaces deliberately, not the default families you would reach for on any other project, and set a clear type scale following the default guidance of The Elements of Typographic Style with intentional weights, widths, and spacing. When type is used as a headline or visual element, use the type treatment itself as an active part of the design, not a neutral delivery vehicle for the content.

Default to line lengths of less than 80 characters. Serif typefaces can have slightly longer line lengths; give serif body text slightly more line-height than a sans-serif.

Avoid these default typographic treatments; they are the commonest tells of a generated page:
- Accenting just a single word or phrase in a headline, like putting one word in italic/bold or a different color.
- Using all caps for labels.
- Adding unnecessary typographic labels above content.

Visual structure is information. Structural devices like outlines, borders, numbering, eyebrows, dividers, labels, etc., encode useful information about the content rather than decorate it. Many generic designs use numbered markers (01 / 02 / 03), but that's only appropriate if the content actually is a sequence — like a stepped process or a timeline. Before adding numbered markers, check the content really is a sequence.

Use non-user-triggered motion sparingly and deliberately, only to draw attention. A single orchestrated moment — one page-load sequence or one reveal — lands better than scattered effects; fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated. Motion that answers a person's action (opening, expanding, confirming) is welcome when it shows what changed.

Consider written content carefully. Often a design brief may not contain real content, and it's up to you to come up with copy and placeholder content. Copy can make a design feel as templated as the design itself. See the below section on writing for more guidance.

## Process: plan, review against the brief, build, critique

For calibration, AI-generated design right now clusters around some traits:
1. a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta or warm-clay accent (often near #D97757 — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell);
2. a near-black background with a single bright acid-green or vermilion accent;
3. a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns;
4. the SaaS-card kit: content chopped into identical rounded cards, one border-radius on everything regardless of hierarchy, the same soft grey shadow (rgba(0,0,0,.1)) under each, and gradient washes as decoration;
5. template chrome that appears whatever the subject: a tracked-out ALL-CAPS eyebrow label above every heading; meta strings joined with middle dots ('A · B · C'); labels built as 'WORD — fragment' with a spaced em dash; tinted near-black (#0B0B0B, #111) standing in for black; a monospace face for small data labels; a '→' appended to link and button text.

All traits are legitimate for some briefs, but they are defaults rather than choices, and they appear regardless of subject. Where the brief pins down a visual direction, follow it exactly — the brief's own words always win, including when it asks for one of these looks. Where it leaves an axis free, don't spend that freedom on one of these defaults. As with a hired human designer, there's often a careful balance between doing what you're good at and taking each project as a chance to experiment and learn.

Work in two passes. First, brainstorm a short design plan based on the client's design brief: create a compact token system with color, type, layout, and principles.
- Color: describe the core base palette as 4–6 named hex values.
- Type: the typefaces and their roles.
- Layout: a layout concept, using one-sentence prose descriptions and ASCII wireframes to ideate and compare. Include alignment guidance; should the content be left aligned, center aligned, justified?
- Principles: the high-level guidance for what makes this page unique.

Then review that plan against the brief before building: if any part of it reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar) rather than a choice made for this specific brief — revise that part, say what you changed and why. Only after you've confirmed the relative uniqueness of your design plan should you start to write the code, following the revised plan.

When writing the code, be careful of structuring your CSS selector specificities. It's easy to generate CSS classes that cancel each other out (especially with a type-based selector like .section and an element-based selector like .cta). This can happen often with padding/margin between sections.

## Restraint and self-critique

Spend your boldness in one place. Let one element be the memorable thing, keep everything around it quiet and disciplined, and cut any decoration that does not serve the brief. Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected, visually accessible, harmonious color palettes.

Critique your own work in the browser as you build, using the Playwright MCP tools. Serve the page, `browser_navigate` to it, and look at the render instead of at your CSS. Take a `browser_take_screenshot` at desktop width, then `browser_resize` to a narrow viewport around 390px and take another, so the mobile layout is reviewed rather than assumed. Read `browser_console_messages` to catch errors and failed assets, use `browser_snapshot` to check the real reading order, heading levels and accessible names, and `browser_click` or `browser_hover` the interactive pieces to confirm states actually respond. A picture is worth 1000 tokens: judge each screenshot as a viewer would — is the hero carrying the brief, is the type doing the personality work, is the eye landing where you intended? Fix what the screenshot exposes and re-shoot; two rounds is usually what separates a deliberate page from a generic one. Some clients prefix these tools with the server name (for example `playwright_browser_navigate`); if no Playwright tools are available, review the rendered page by another means and say so rather than claiming you looked at it.

Consider Chanel's advice: before leaving the house, take a look in the mirror and remove one accessory. Human creatives have memory and always try to do something new, so if you have a space to quickly jot down notes about what you've tried, it can help you in future passes.

## More on writing in design

Words appear in a design for one reason: to make it easier to understand and use. They are design content, not decoration. Bring the same intentionality and minimalism to copywriting that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience.

Write from the end user's perspective. Name things by what users will understand in simple language, not by how the system is built. A user manages notifications, not webhook config. Describe what something is or does in plain terms rather than selling it. Being specific and legible to new users is always better than being clever.

Use active voice as default. A CTA says exactly what happens when it is used: "Save changes," not "Submit." An action keeps the same name through the whole flow, so the button that says "Publish" produces a toast that says "Published." The vocabulary of an interface is the signposting for someone navigating the product. Cohesion and consistency are how people learn their way around.

Treat failure and emptiness as moments for direction, not mood. Explain what went wrong and how to fix it, in the interface's voice rather than a person's. Errors don't apologize, and they are never vague about what happened. An empty screen is an invitation to act.

Keep the tone conversational: plain verbs, sentence case, no filler, with tone matched to the brand and the audience. Let each written element do exactly one job.
