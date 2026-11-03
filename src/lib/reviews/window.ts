export const REVIEW_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isWithinReviewWindow(
  createdAt: string | Date,
  now: Date = new Date(),
): boolean {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const limit = new Date(now.getTime() - REVIEW_WINDOW_DAYS * DAY_MS);
  return created.getTime() > limit.getTime();
}
