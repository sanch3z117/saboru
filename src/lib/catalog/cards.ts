import type { WeeklySchedule } from "./schedule";

export type EstablishmentCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  plan: string;
  status: string;
  photoPath: string | null;
  schedule: WeeklySchedule | null;
  distanceMeters: number | null;
  priceFromCop: number | null;
  rating: number | null;
  reviewCount: number;
};

export type ProductCardData = {
  id: string;
  establishmentId: string;
  establishmentSlug: string;
  establishmentName: string;
  name: string;
  description: string;
  category: string;
  priceCop: number;
  photoPath: string | null;
  available: boolean;
  schedule: WeeklySchedule | null;
  distanceMeters: number | null;
  rating: number | null;
  reviewCount: number;
  allergens: string[];
};

export function scheduleFromJson(value: unknown): WeeklySchedule | null {
  if (!value || typeof value !== "object") return null;
  return value as WeeklySchedule;
}
