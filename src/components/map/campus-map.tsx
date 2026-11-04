"use client";

import {
  getVersion,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Coordinates } from "@/lib/catalog/distance";
import {
  CAMPUS_DEFAULT_ZOOM,
  CAMPUS_MAX_ZOOM,
  CAMPUS_MIN_ZOOM,
  FALLBACK_CAMPUS_BOUNDS,
  MAPLIBRE_WORKER_PATH,
  mapStyleFor,
} from "@/lib/map/config";
import { campusBoundsFromBlocks, type MapPlace } from "@/lib/map/places";
import type { SnapshotBlock } from "@/types/catalog";

import { MapControls } from "./map-controls";
import { MapFallback } from "./map-fallback";
import { MAP_FRAME_CLASS } from "./map-frame";
import {
  createBlockLabelElement,
  createPlaceMarkerElement,
  createUserMarkerElement,
  setPlaceMarkerSelected,
} from "./map-marker";
import { MapSkeleton } from "./map-skeleton";

// El worker se sirve desde `public/` para que `worker-src 'self'` baste y no
// dependa de la detección automática de workers del bundler.
setWorkerUrl(`${MAPLIBRE_WORKER_PATH}?v=${getVersion()}`);

type MapStatus = "loading" | "ready" | "error";

export type CampusMapProps = {
  places: readonly MapPlace[];
  blocks: readonly SnapshotBlock[];
  origin: Coordinates;
  userPosition: Coordinates | null;
  selectedId: string | null;
  onSelect: (placeId: string | null) => void;
  onLocate: () => void;
  locating: boolean;
  describedBy?: string;
};

export function CampusMap({
  places,
  blocks,
  origin,
  userPosition,
  selectedId,
  onSelect,
  onLocate,
  locating,
  describedBy,
}: CampusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const blockMarkersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const initialOriginRef = useRef(origin);

  const [status, setStatus] = useState<MapStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [osmFallback, setOsmFallback] = useState(false);

  // Si MapTiler rechaza el dominio (por ejemplo, un preview sin restricción de
  // clave), se reintenta con OSM en vez de dejar el mapa vacío.
  const styleConfig = useMemo(
    () => mapStyleFor(osmFallback ? null : undefined),
    [osmFallback],
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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

    let removed = false;
    let loaded = false;
    let errorCount = 0;

    const map = new MapLibreMap({
      container,
      style: styleConfig.style,
      center: [
        initialOriginRef.current.longitude,
        initialOriginRef.current.latitude,
      ],
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
        "Map.Title": "Mapa del campus",
      },
    });

    mapRef.current = map;
    map.touchZoomRotate.disableRotation();

    const fail = (message: string) => {
      if (removed) return;
      removed = true;
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

      if (
        styleConfig.provider === "maptiler" &&
        !osmFallback &&
        (!loaded || errorCount >= 2)
      ) {
        setOsmFallback(true);
        return;
      }

      if (!loaded && errorCount >= 2) {
        fail("No pudimos cargar el mapa. Revisa tu conexión.");
      } else if (loaded && errorCount >= 5) {
        fail("No pudimos cargar las teselas del mapa.");
      }
    });

    map.on("idle", () => {
      window.clearTimeout(tilesTimeout);
    });

    map.on("click", () => {
      onSelectRef.current(null);
    });

    return () => {
      window.clearTimeout(loadTimeout);
      window.clearTimeout(tilesTimeout);
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
  }, [attempt, osmFallback, styleConfig]);

  // Ajusta los bounds reales y dibuja las etiquetas de los 6 bloques.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const marker of blockMarkersRef.current) marker.remove();
    blockMarkersRef.current = [];

    const bounds = campusBoundsFromBlocks(blocks);
    map.setMaxBounds(bounds);
    map.fitBounds(bounds, {
      padding: 28,
      duration: 0,
      maxZoom: CAMPUS_DEFAULT_ZOOM,
    });

    for (const block of blocks) {
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
  }, [blocks, mapReady]);

  // Marcadores Pin-U de los locales filtrados.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

    for (const place of places) {
      const element = createPlaceMarkerElement(place);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(place.id);
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
  }, [mapReady, places]);

  useEffect(() => {
    for (const marker of markersRef.current) {
      const element = marker.getElement();
      const id = element.getAttribute("data-establishment-id");
      if (!id) continue;
      setPlaceMarkerSelected(element, id === selectedId);
    }

    const map = mapRef.current;
    const selected = places.find((place) => place.id === selectedId);
    if (map && mapReady && selected) {
      map.easeTo({
        center: [selected.longitude, selected.latitude],
        duration: 300,
      });
    }
  }, [mapReady, places, selectedId]);

  // Punto del usuario, solo si la superficie ya obtuvo una posición real.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!userPosition) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    const element = createUserMarkerElement();
    const marker = new Marker({ element, anchor: "center" })
      .setLngLat([userPosition.longitude, userPosition.latitude])
      .addTo(map);
    userMarkerRef.current?.remove();
    userMarkerRef.current = marker;

    map.easeTo({
      center: [userPosition.longitude, userPosition.latitude],
      zoom: Math.max(map.getZoom(), 16.2),
      duration: 600,
    });

    return () => {
      marker.remove();
      if (userMarkerRef.current === marker) userMarkerRef.current = null;
    };
  }, [mapReady, userPosition]);

  useEffect(() => {
    const handleOffline = () => {
      if (!mapRef.current) return;
      setStatus("error");
      setErrorMessage("Sin conexión. El mapa necesita internet.");
    };

    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  return (
    <div className={MAP_FRAME_CLASS} aria-busy={status === "loading"}>
      <div
        ref={mapContainerRef}
        data-testid="campus-map"
        data-map-provider={styleConfig.provider}
        role="region"
        aria-label="Mapa interactivo del campus"
        aria-describedby={describedBy}
        className="h-full w-full"
      />

      {status === "loading" ? <MapSkeleton overlay /> : null}

      {status === "error" ? (
        <MapFallback
          message={errorMessage ?? "No pudimos cargar el mapa en este momento."}
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
            map?.fitBounds(campusBoundsFromBlocks(blocks), {
              padding: 28,
              duration: 300,
            });
          }}
          onLocate={onLocate}
        />
      ) : null}
    </div>
  );
}
