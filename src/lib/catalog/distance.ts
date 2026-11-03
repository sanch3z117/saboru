const EARTH_RADIUS_M = 6371008.8;

export type Coordinates = { latitude: number; longitude: number };

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/**
 * Distancia en metros entre dos puntos (haversine). Offline no hay PostGIS:
 * esta fórmula aproxima `st_distance` y debe mantener el mismo orden que el RPC.
 */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
