/**
 * Tokens de marca de SaborU.
 *
 * Fuente de verdad: `docs/05-MARCA-Y-UI.md`. Los valores existen aquí para
 * componentes que no pueden usar clases Tailwind (SVG, MapLibre, imágenes
 * generadas, metadatos). En JSX se prefieren las utilidades derivadas de
 * `globals.css` (`bg-campus`, `text-antojo`, `shadow-hard`…).
 */
export const brand = {
  colors: {
    campus: "#F5B800",
    antojo: "#F26B21",
    carbon: "#2B2B2B",
    cream: "#FFF6E5",
    verified: "#2E9E6B",
    verifiedSoft: "#E6F4EC",
    verifiedInk: "#1F7A50",
  },
  fonts: {
    display: "Poppins",
    sans: "Inter",
  },
  radius: {
    card: 12,
    panel: 10,
    pill: 9999,
  },
  shadow: {
    hard: "4px 4px 0 0 #2B2B2B",
    hardSmall: "2px 2px 0 0 #2B2B2B",
  },
} as const;

export type BrandColor = keyof typeof brand.colors;

export function brandColor(color: BrandColor) {
  return brand.colors[color];
}
