import type { StyleSpecification } from "maplibre-gl";

import type { Coordinates } from "@/lib/catalog/distance";

/** Centro de referencia del campus (docs/06). */
export const CAMPUS_CENTER: Coordinates = {
  latitude: 5.5520095,
  longitude: -73.3566646,
};

export const CAMPUS_DEFAULT_ZOOM = 16.4;
export const CAMPUS_MIN_ZOOM = 14;
export const CAMPUS_MAX_ZOOM = 19;
export const CAMPUS_BOUNDS_PADDING = 0.0018;

/** [[oeste, sur], [este, norte]] para MapLibre. */
export type MapBounds = [[number, number], [number, number]];

export const FALLBACK_CAMPUS_BOUNDS: MapBounds = [
  [CAMPUS_CENTER.longitude - 0.0032, CAMPUS_CENTER.latitude - 0.0026],
  [CAMPUS_CENTER.longitude + 0.0032, CAMPUS_CENTER.latitude + 0.0026],
];

export const MAPLIBRE_WORKER_PATH = "/maplibre/maplibre-gl-worker.mjs";

export const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAPTILER_ATTRIBUTION =
  '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> ' +
  OSM_ATTRIBUTION;

export type MapProvider = "maptiler" | "osm";

export type MapStyleConfig = {
  provider: MapProvider;
  style: string | StyleSpecification;
  attribution: string;
};

function osmStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  };
}

/**
 * MapTiler si hay clave; si no, OpenStreetMap. La clave es pública por diseño
 * (`NEXT_PUBLIC_*`), pero nunca debe venir de `service_role` ni de secretos.
 */
export function mapStyleFor(
  key: string | null | undefined = process.env.NEXT_PUBLIC_MAPTILER_KEY,
): MapStyleConfig {
  const value = key?.trim();
  if (value) {
    return {
      provider: "maptiler",
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(value)}`,
      attribution: MAPTILER_ATTRIBUTION,
    };
  }

  return {
    provider: "osm",
    style: osmStyle(),
    attribution: OSM_ATTRIBUTION,
  };
}
