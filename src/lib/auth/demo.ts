export const DEMO_EMAIL_NOTICE =
  "Modo demo: puedes registrarte con cualquier correo";

/**
 * Bandera de servidor para el registro de demostración. Solo vale cuando el
 * valor es exactamente "true"; cualquier otro valor mantiene la regla
 * institucional. Nunca debe llevar el prefijo NEXT_PUBLIC_.
 */
export function demoEmailModeEnabled(
  value: string | undefined = process.env.DEMO_ALLOW_ANY_EMAIL,
) {
  return value === "true";
}
