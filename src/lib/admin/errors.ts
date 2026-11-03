type AdminError = {
  code?: string | null;
  message?: string | null;
};

const MESSAGES: { needle: string; message: string }[] = [
  {
    needle: "slug_exists",
    message: "Ya existe un local con ese slug. Prueba con otro.",
  },
  {
    needle: "invalid_name",
    message: "El nombre debe tener entre 3 y 60 caracteres.",
  },
  {
    needle: "invalid_slug",
    message:
      "El slug debe tener entre 3 y 80 caracteres y usar solo minúsculas, números y guiones.",
  },
  {
    needle: "invalid_block",
    message: "Selecciona un bloque del campus.",
  },
  {
    needle: "invalid_coordinates",
    message: "Las coordenadas deben estar entre -90/90 y -180/180.",
  },
  {
    needle: "invalid_category",
    message: "Escribe una categoría de máximo 40 caracteres.",
  },
  {
    needle: "invalid_description",
    message: "La descripción no puede pasar de 600 caracteres.",
  },
  {
    needle: "invalid_address",
    message: "La dirección no puede pasar de 120 caracteres.",
  },
  {
    needle: "invalid_schedule",
    message: "El horario no tiene un formato válido.",
  },
  {
    needle: "review_not_found",
    message: "Esa reseña ya no existe.",
  },
  {
    needle: "report_not_found",
    message: "Ese reporte ya no existe.",
  },
  {
    needle: "establishment_not_found",
    message: "Ese local ya no existe.",
  },
  {
    needle: "invite_exists",
    message: "Ya hay una invitación abierta para ese correo.",
  },
  {
    needle: "establishment_has_owner",
    message: "Ese local ya tiene un vendedor asignado.",
  },
  {
    needle: "email_already_registered",
    message: "Ese correo ya tiene una cuenta en SaborU.",
  },
  {
    needle: "invalid_email",
    message: "Escribe un correo válido.",
  },
];

/** Traduce los errores de las RPC admin a mensajes de interfaz. */
export function adminErrorMessage(error: AdminError) {
  const message = error.message ?? "";

  if (error.code === "42501" || message.includes("forbidden")) {
    return "Solo un administrador puede hacer esto.";
  }

  for (const entry of MESSAGES) {
    if (message.includes(entry.needle)) {
      return entry.message;
    }
  }

  return "No pudimos completar la acción. Intenta de nuevo.";
}
