"use client";

import { useEffect } from "react";

import { saveViewer, type CachedViewer } from "@/lib/offline/viewer";

/**
 * Guarda el rol/canReview del usuario actual para decidir, sin red, si puede
 * escribir reseñas o favoritos en `/offline`. El servidor sigue validando.
 */
export function ViewerCache({ viewer }: { viewer: CachedViewer | null }) {
  useEffect(() => {
    if (viewer) {
      saveViewer(viewer);
    }
  }, [viewer]);

  return null;
}
