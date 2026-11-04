"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Coordinates } from "@/lib/catalog/distance";

export type GeolocationStatus =
  | "idle"
  | "locating"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export type UserPosition = Coordinates & {
  accuracy: number | null;
};

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60_000,
};

/**
 * Geolocalización bajo demanda. No se pide al montar, no se persiste y no se
 * envía a analítica: la coordenada solo vive en memoria mientras el mapa esté
 * abierto.
 */
export function useGeolocation(options: PositionOptions = GEOLOCATION_OPTIONS) {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [position, setPosition] = useState<UserPosition | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
    };
  }, []);

  const request = useCallback(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      setStatus("unsupported");
      setPosition(null);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (requestRef.current !== requestId) return;
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy:
            typeof result.coords.accuracy === "number"
              ? result.coords.accuracy
              : null,
        });
        setStatus("granted");
      },
      (error) => {
        if (requestRef.current !== requestId) return;
        setPosition(null);
        if (error.code === 1) {
          setStatus("denied");
        } else if (error.code === 3) {
          setStatus("timeout");
        } else {
          setStatus("unavailable");
        }
      },
      options,
    );
  }, [options]);

  const reset = useCallback(() => {
    requestRef.current += 1;
    setStatus("idle");
    setPosition(null);
  }, []);

  return { status, position, request, reset };
}
