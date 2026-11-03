import type { AppRole } from "@/lib/auth/roles";

export type CachedViewer = {
  userId: string;
  email: string;
  role: AppRole;
  canReview: boolean;
};

const VIEWER_KEY = "saboru:viewer";

function isViewer(value: unknown): value is CachedViewer {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === "string" &&
    typeof candidate.email === "string" &&
    (candidate.role === "student" ||
      candidate.role === "vendor" ||
      candidate.role === "admin") &&
    typeof candidate.canReview === "boolean"
  );
}

export function saveViewer(viewer: CachedViewer) {
  try {
    localStorage.setItem(VIEWER_KEY, JSON.stringify(viewer));
  } catch {
    // Sin almacenamiento: el formulario offline se oculta y el servidor decide.
  }
}

export function readViewer(): CachedViewer | null {
  try {
    const raw = localStorage.getItem(VIEWER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isViewer(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearViewer() {
  try {
    localStorage.removeItem(VIEWER_KEY);
  } catch {
    // Nada que limpiar.
  }
}
