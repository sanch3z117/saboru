import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGeolocation } from "@/hooks/use-geolocation";

function installGeolocation(implementation: Geolocation["getCurrentPosition"]) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: implementation },
  });
}

function removeGeolocation() {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined,
  });
}

afterEach(() => {
  removeGeolocation();
  vi.restoreAllMocks();
});

describe("useGeolocation", () => {
  it("no pide la ubicación al montar", () => {
    const getCurrentPosition = vi.fn();
    installGeolocation(getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());

    expect(result.current.status).toBe("idle");
    expect(result.current.position).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("guarda la posición cuando el permiso se concede", () => {
    const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>(
      (success) => {
        success({
          coords: {
            latitude: 5.5521,
            longitude: -73.3566,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: 1,
          toJSON: () => ({}),
        });
      },
    );
    installGeolocation(getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("granted");
    expect(result.current.position).toEqual({
      latitude: 5.5521,
      longitude: -73.3566,
      accuracy: 12,
    });
  });

  it("distingue permiso denegado, no disponible y timeout", () => {
    const cases = [
      { code: 1, status: "denied" },
      { code: 2, status: "unavailable" },
      { code: 3, status: "timeout" },
    ] as const;

    for (const item of cases) {
      removeGeolocation();
      const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>(
        (_success, error) => {
          error?.({
            code: item.code,
            message: "error",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      );
      installGeolocation(getCurrentPosition);

      const { result } = renderHook(() => useGeolocation());
      act(() => result.current.request());

      expect(result.current.status).toBe(item.status);
      expect(result.current.position).toBeNull();
    }
  });

  it("marca no soportado si el navegador no expone geolocation", () => {
    removeGeolocation();

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("unsupported");
  });

  it("permite reiniciar el estado", () => {
    installGeolocation(
      vi.fn<Geolocation["getCurrentPosition"]>((success) => {
        success({
          coords: {
            latitude: 5.55,
            longitude: -73.35,
            accuracy: 0,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: 1,
          toJSON: () => ({}),
        });
      }),
    );

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    act(() => result.current.reset());

    expect(result.current.status).toBe("idle");
    expect(result.current.position).toBeNull();
  });
});
