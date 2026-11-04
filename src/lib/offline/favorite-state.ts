export type FavoriteResolutionInput = {
  serverAvailable: boolean;
  serverSaved: boolean | null;
  localSaved: boolean;
  pendingAt: number | null;
  serverLoadedAt: number;
};

export type FavoriteResolution = {
  saved: boolean;
  source: "server" | "local";
};

/**
 * Prioridad: el servidor manda cuando su estado está disponible y no hay una
 * operación local más nueva que la carga de la página. Si la cola offline es
 * más reciente que la respuesta del servidor, la intención local gana.
 */
export function resolveFavoriteState({
  serverAvailable,
  serverSaved,
  localSaved,
  pendingAt,
  serverLoadedAt,
}: FavoriteResolutionInput): FavoriteResolution {
  if (serverAvailable && serverSaved !== null) {
    if (pendingAt !== null && pendingAt > serverLoadedAt) {
      return { saved: localSaved, source: "local" };
    }
    return { saved: serverSaved, source: "server" };
  }

  return { saved: localSaved, source: "local" };
}
