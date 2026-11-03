export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type DayRanges = [string, string][];

export type WeeklySchedule = Partial<Record<DayKey, DayRanges>>;

const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts
    .find((part) => part.type === "weekday")
    ?.value.toLowerCase()
    .slice(0, 3) as DayKey;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return { weekday, minutes: hour * 60 + minute };
}

/**
 * Un rango con cierre menor que la apertura cruza medianoche
 * (ej. ["18:00", "02:00"]). Hora de pared en la zona indicada.
 */
export function isOpenAt(
  schedule: WeeklySchedule | null | undefined,
  date: Date,
  timeZone = "America/Bogota",
): boolean {
  if (!schedule) return false;

  const { weekday, minutes } = zonedParts(date, timeZone);
  const dayIndex = DAY_KEYS.indexOf(weekday);
  if (dayIndex === -1) return false;

  const today = DAY_KEYS[dayIndex]!;
  const yesterday = DAY_KEYS[(dayIndex + 6) % 7]!;

  for (const [open, close] of schedule[today] ?? []) {
    const start = toMinutes(open);
    const end = toMinutes(close);

    if (start === end) continue;

    if (start < end) {
      if (minutes >= start && minutes < end) return true;
    } else if (minutes >= start) {
      return true;
    }
  }

  for (const [open, close] of schedule[yesterday] ?? []) {
    const start = toMinutes(open);
    const end = toMinutes(close);

    if (end <= start && minutes < end) return true;
  }

  return false;
}
