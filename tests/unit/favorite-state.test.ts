import { describe, expect, it } from "vitest";

import { resolveFavoriteState } from "@/lib/offline/favorite-state";

describe("prioridad de favoritos", () => {
  it("el servidor manda cuando está disponible y no hay una cola más nueva", () => {
    expect(
      resolveFavoriteState({
        serverAvailable: true,
        serverSaved: true,
        localSaved: false,
        pendingAt: 100,
        serverLoadedAt: 200,
      }),
    ).toEqual({ saved: true, source: "server" });
  });

  it("una operación local posterior a la carga gana sobre el servidor", () => {
    expect(
      resolveFavoriteState({
        serverAvailable: true,
        serverSaved: false,
        localSaved: true,
        pendingAt: 300,
        serverLoadedAt: 200,
      }),
    ).toEqual({ saved: true, source: "local" });
  });

  it("sin servidor disponible manda IndexedDB/outbox", () => {
    expect(
      resolveFavoriteState({
        serverAvailable: false,
        serverSaved: null,
        localSaved: true,
        pendingAt: null,
        serverLoadedAt: 200,
      }),
    ).toEqual({ saved: true, source: "local" });
  });
});
