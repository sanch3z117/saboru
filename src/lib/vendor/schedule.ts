import {
  SCHEDULE_DAYS,
  type DayRanges,
  type WeeklySchedule,
} from "@/lib/catalog/schedule";

export type ScheduleParseResult =
  | { ok: true; data: WeeklySchedule }
  | { ok: false; message: string };

/**
 * Lee los campos `{día}-{franja}-start` / `-end` del formulario. Cada día
 * admite hasta dos franjas; una franja con un solo extremo es un error.
 */
export function scheduleFromFormData(
  formData: Pick<FormData, "get">,
): ScheduleParseResult {
  const schedule: WeeklySchedule = {};

  for (const { key, label } of SCHEDULE_DAYS) {
    const ranges: DayRanges = [];

    for (const slot of [1, 2] as const) {
      const start = String(formData.get(`${key}-${slot}-start`) ?? "").trim();
      const end = String(formData.get(`${key}-${slot}-end`) ?? "").trim();

      if (!start && !end) {
        continue;
      }

      if (!start || !end) {
        return {
          ok: false,
          message: `${label}: completa la apertura y el cierre de la franja.`,
        };
      }

      ranges.push([start, end]);
    }

    schedule[key] = ranges;
  }

  return { ok: true, data: schedule };
}

/**
 * PostGIS devuelve `geography(Point,4326)` como EWKB hexadecimal
 * (`0101000020E6100000` + lng + lat, little-endian). Devuelve null si el
 * formato no es el esperado.
 */
export function parsePointHex(
  value: unknown,
): { lat: number; lng: number } | null {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const hex = value.trim();
  if (
    !/^[0-9a-f]+$/i.test(hex) ||
    hex.length !== 50 ||
    !hex.toLowerCase().startsWith("0101000020")
  ) {
    return null;
  }

  const bytes = new Uint8Array(16);
  for (let index = 0; index < 16; index += 1) {
    const start = 18 + index * 2;
    bytes[index] = Number.parseInt(hex.slice(start, start + 2), 16);
  }

  const view = new DataView(bytes.buffer);
  const lng = view.getFloat64(0, true);
  const lat = view.getFloat64(8, true);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  return { lat, lng };
}

export function formatCoordinate(value: number) {
  return value.toFixed(6);
}
