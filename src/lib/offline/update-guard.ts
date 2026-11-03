let blockers = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Bloquea la recarga por actualización del service worker mientras haya un
 * formulario o un envío en curso (docs/04). Devuelve la función para liberar.
 */
export function beginUpdateBlock() {
  blockers += 1;
  emit();
  let released = false;

  return () => {
    if (released) {
      return;
    }
    released = true;
    blockers = Math.max(0, blockers - 1);
    emit();
  };
}

export function isUpdateBlocked() {
  return blockers > 0;
}

export function subscribeUpdateBlocked(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
