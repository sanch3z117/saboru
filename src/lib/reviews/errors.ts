export type ReviewErrorCode =
  | "review_cooldown"
  | "product_unavailable"
  | "duplicate"
  | "window_expired"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "own_review"
  | "already_reported"
  | "invalid"
  | "rate_limited";

export function mapReviewDbError(error: {
  code?: string | null;
  message?: string | null;
}): ReviewErrorCode {
  const message = error.message ?? "";

  if (message.includes("review_cooldown")) return "review_cooldown";
  if (message.includes("product_unavailable")) return "product_unavailable";
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501") return "forbidden";
  if (error.code === "P0002") return "not_found";

  return "invalid";
}

export function reviewErrorMessage(code: ReviewErrorCode): string {
  switch (code) {
    case "review_cooldown":
      return "Ya reseñaste este producto hace menos de 30 días. Podrás editarla o volver a reseñar más adelante.";
    case "product_unavailable":
      return "Este producto ya no está disponible para reseñar.";
    case "duplicate":
      return "Esta reseña ya se había guardado.";
    case "window_expired":
      return "Pasaron más de 30 días: ya no puedes editar esta reseña.";
    case "unauthorized":
      return "Entra con tu correo institucional para continuar.";
    case "forbidden":
      return "Solo estudiantes institucionales de la UPTC pueden hacer esto.";
    case "not_found":
      return "No encontramos esa reseña.";
    case "own_review":
      return "No puedes reportar tu propia reseña.";
    case "already_reported":
      return "Ya reportaste esta reseña.";
    case "rate_limited":
      return "Demasiadas acciones en poco tiempo. Espera un momento.";
    default:
      return "No pudimos guardar los datos. Revisa el formulario.";
  }
}
