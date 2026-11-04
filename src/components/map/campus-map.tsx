"use client";

import {
  getVersion,
  Map as MapLibreMap,
  Marker,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import { Alert } from "@/components/ui/alert";
import { useGeolocation } from "@/hooks/use-geolocation";
import {
  CAMPUS_CENTER,
  CAMPUS_DEFAULT_ZOOM,
  CAMPUS_MAX_ZOOM,
  CAMPUS_MIN_ZOOM,
  FALLBACK_CAMPUS_BOUNDS,
  MAPLIBRE_WORKER_PATH,
  mapStyleFor,
} from "@/lib/map/config";
import {
  campusBoundsFromBlocks,
  placesFromSnapshot,
  type MapPlace,
} from "@/lib/map/places";
import type { CatalogSnapshot } from "@/types/catalog";
import { cn } from "@/lib/utils";

import { MapControls } from "./map-controls";
import { MapFallback } from "./map-fallback";
import { MAP_FRAME_CLASS } from "./map-frame";
import {
  createBlockLabelElement,
  createPlaceMarkerElement,
  createUserMarkerElement,
  setPlaceMarkerSelected,
} from "./map-marker";
import { MapPlaceList } from "./map-place-list";
import { MapPopup } from "./map-popup";
import { MapSkeleton } from "./map-skeleton";

// El worker se sirve desde `public/` para que `worker-src 'self'` baste y no
// dependa de la detección automática de workers del bundler.
setWorkerUrl(`${MAPLIBRE_WORKER_PATH}?v=${getVersion()}`);

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60_000,
};

type MapStatus = "loading" | "ready" | "error";

function isCatalogSnapshot(value: unknown): value is CatalogSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<CatalogSnapshot>;
  return (
    Array.isArray(snapshot.blocks) &&
    Array.isArray(snapshot.establishments) &&
    Array.isArray(snapshot.products) &&
    Array.isArray(snapshot.product_stats) &&
    Array.isArray(snapshot.reviews)
  );
}

export function CampusMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const blockMarkersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const popupRootRef = useRef<Root | null>(null);

  const [status, setStatus] = useState<MapStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const geolocation = useGeolocation(GEOLOCATION_OPTIONS);
  const origin = geolocation.position ?? CAMPUS_CENTER;
  const styleConfig = useMemo(() => mapStyleFor(), []);

  const places = useMemo(
    () => (snapshot ? placesFromSnapshot(snapshot, origin) : []),
    [snapshot, origin],
  );

  const closePopup = useCallback(() => {
    const popup = popupRef.current;
    if (!popup) {
      setSelectedId(null);
      return;
    }
    popup.remove();
  }, []);

  // Descarga del snapshot público. El mapa no usa IndexedDB ni el snapshot
  // offline: si no hay red, se muestra la lista y el aviso.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setSnapshot(null);
    setSnapshotError(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSnapshotError("Sin conexión. El mapa necesita internet.");
      setStatus("error");
      setErrorMessage("Sin conexión. El mapa necesita internet.");
      return () => {
        active = false;
        controller.abort();
      };
    }

    fetch("/api/catalog/snapshot", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("snapshot");
        const data: unknown = await response.json();
        if (!isCatalogSnapshot(data)) throw new Error("snapshot-format");
        if (!active) return;
        setSnapshot(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setSnapshotError("No pudimos cargar los locales del campus.");
        setStatus("error");
        setErrorMessage("No pudimos cargar los locales del campus.");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  // Inicializa MapLibre una vez por intento. El componente solo se carga con
  // `dynamic(..., { ssr: false })`.
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("error");
      setErrorMessage("Sin conexión. El mapa necesita internet.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setMapReady(false);
    setSelectedId(null);

    let removed = false;
    let loaded = false;
    let errorCount = 0;

    const map = new MapLibreMap({
      container,
      style: styleConfig.style,
      center: [CAMPUS_CENTER.longitude, CAMPUS_CENTER.latitude],
      zoom: CAMPUS_DEFAULT_ZOOM,
      minZoom: CAMPUS_MIN_ZOOM,
      maxZoom: CAMPUS_MAX_ZOOM,
      maxBounds: FALLBACK_CAMPUS_BOUNDS,
      attributionControl: {
        compact: false,
        customAttribution: styleConfig.attribution,
      },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      locale: {
        "Popup.Close": "Cerrar",
      },
    });

    mapRef.current = map;
    map.touchZoomRotate.disableRotation();

    const fail = (message: string) => {
      if (removed) return;
      removed = true;
      closePopup();
      markersRef.current = [];
      blockMarkersRef.current = [];
      userMarkerRef.current = null;
      setErrorMessage(message);
      setStatus("error");
      setMapReady(false);
      try {
        map.remove();
      } catch {
        // MapLibre ya puede estar destruido.
      }
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };

    const loadTimeout = window.setTimeout(() => {
      if (!loaded) fail("El mapa tardó demasiado en cargar.");
    }, 12_000);

    const tilesTimeout = window.setTimeout(() => {
      if (loaded && !map.areTilesLoaded()) {
        fail("No pudimos cargar las teselas del mapa.");
      }
    }, 12_000);

    map.on("load", () => {
      loaded = true;
      window.clearTimeout(loadTimeout);
      setMapReady(true);
      setStatus("ready");
    });

    map.on("error", () => {
      errorCount += 1;
      if (!loaded && errorCount >= 2) {
        fail("No pudimos cargar el mapa. Revisa tu conexión.");
      } else if (loaded && errorCount >= 5) {
        fail("No pudimos cargar las teselas del mapa.");
      }
    });

    map.on("idle", () => {
      window.clearTimeout(tilesTimeout);
    });

    return () => {
      window.clearTimeout(loadTimeout);
      window.clearTimeout(tilesTimeout);
      closePopup();
      markersRef.current = [];
      blockMarkersRef.current = [];
      userMarkerRef.current = null;
      if (mapRef.current === map) {
        mapRef.current = null;
        try {
          map.remove();
        } catch {
          // MapLibre ya puede estar destruido.
        }
      }
    };
  }, [attempt, closePopup, styleConfig]);

  // Ajusta los bounds reales cuando llega el snapshot (6 bloques).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !snapshot) return;
    const bounds = campusBoundsFromBlocks(snapshot.blocks);
    map.setMaxBounds(bounds);
    map.fitBounds(bounds, {
      padding: 28,
      duration: 0,
      maxZoom: CAMPUS_DEFAULT_ZOOM,
    });
  }, [mapReady, snapshot]);

  // Etiquetas de los bloques del campus.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !snapshot) return;

    for (const block of snapshot.blocks) {
      if (block.latitude === null || block.longitude === null) continue;
      const marker = new Marker({
        element: createBlockLabelElement(block.name),
        anchor: "center",
        offset: [0, -4],
      })
        .setLngLat([block.longitude, block.latitude])
        .addTo(map);
      blockMarkersRef.current.push(marker);
    }

    return () => {
      for (const marker of blockMarkersRef.current) marker.remove();
      blockMarkersRef.current = [];
    };
  }, [mapReady, snapshot]);

  const openPopup = useCallback((place: MapPlace) => {
    const map = mapRef.current;
    if (!map) return;

    popupRef.current?.remove();

    const container = document.createElement("div");
    const root = createRoot(container);
    // MapLibre decide el anchor con la altura del contenido; si se añade vacío
    // el popup queda debajo del marcador y se recorta con el marco del mapa.
    flushSync(() => {
      root.render(<MapPopup place={place} />);
    });

    const popup = new Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "320px",
      className: "saboru-map-popup",
      offset: 20,
      padding: { top: 20, right: 0, bottom: 20, left: 0 },
    })
      .setLngLat([place.longitude, place.latitude])
      .setDOMContent(container)
      .addTo(map);

    popupRef.current = popup;
    popupRootRef.current = root;
    setSelectedId(place.id);

    map.easeTo({
      center: [place.longitude, place.latitude],
      duration: 300,
    });

    popup.on("close", () => {
      popupRef.current = null;
      const currentRoot = popupRootRef.current;
      popupRootRef.current = null;
      if (currentRoot) currentRoot.unmount();
      setSelectedId(null);
    });
  }, []);

  // Marcadores Pin-U de los establecimientos.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

    for (const place of places) {
      const element = createPlaceMarkerElement(place);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        openPopup(place);
      });
      const marker = new Marker({
        element,
        anchor: "bottom",
        offset: [0, 0],
      })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }

    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
    };
  }, [mapReady, places, openPopup]);

  useEffect(() => {
    for (const marker of markersRef.current) {
      const element = marker.getElement();
      const id = element.getAttribute("data-establishment-id");
      if (!id) continue;
      setPlaceMarkerSelected(element, id === selectedId);
    }
  }, [places, selectedId]);

  // Punto del usuario, solo después de pulsar “Usar mi ubicación”.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!geolocation.position) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    const element = createUserMarkerElement();
    const marker = new Marker({ element, anchor: "center" })
      .setLngLat([
        geolocation.position.longitude,
        geolocation.position.latitude,
      ])
      .addTo(map);
    userMarkerRef.current?.remove();
    userMarkerRef.current = marker;

    map.easeTo({
      center: [geolocation.position.longitude, geolocation.position.latitude],
      zoom: Math.max(map.getZoom(), 16.2),
      duration: 600,
    });

    return () => {
      marker.remove();
      if (userMarkerRef.current === marker) userMarkerRef.current = null;
    };
  }, [geolocation.position, mapReady]);

  useEffect(() => {
    const handleOffline = () => {
      if (!mapRef.current) return;
      setStatus("error");
      setErrorMessage("Sin conexión. El mapa necesita internet.");
    };

    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  const locating = geolocation.status === "locating";
  const locationMessage =
    geolocation.status === "denied" ||
    geolocation.status === "unavailable" ||
    geolocation.status === "timeout" ||
    geolocation.status === "unsupported";

  return (
    <div>
      <div
        className={cn(MAP_FRAME_CLASS, "mt-4")}
        aria-busy={status === "loading"}
      >
        <div
          ref={mapContainerRef}
          data-testid="campus-map"
          role="region"
          aria-label="Mapa interactivo del campus"
          aria-describedby={places.length > 0 ? "mapa-lista" : undefined}
          className="h-full w-full"
        />

        {status === "loading" ? <MapSkeleton overlay /> : null}

        {status === "error" ? (
          <MapFallback
            message={
              errorMessage ??
              snapshotError ??
              "No pudimos cargar el mapa en este momento."
            }
            provider={styleConfig.provider}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : null}

        {status === "ready" ? (
          <MapControls
            locating={locating}
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            onRecenter={() => {
              const map = mapRef.current;
              const bounds = snapshot
                ? campusBoundsFromBlocks(snapshot.blocks)
                : FALLBACK_CAMPUS_BOUNDS;
              map?.fitBounds(bounds, { padding: 28, duration: 300 });
            }}
            onLocate={geolocation.request}
          />
        ) : null}
      </div>

      {locationMessage ? (
        <Alert tone="warning" className="mt-3">
          Usando el centro del campus. Activa la ubicación para ver distancias
          desde donde estás.
        </Alert>
      ) : null}

      {geolocation.status === "granted" ? (
        <p role="status" className="mt-3 text-sm text-carbon/70">
          Viendo distancias desde tu ubicación.
        </p>
      ) : null}

      <MapPlaceList places={places} />
    </div>
  );
}
