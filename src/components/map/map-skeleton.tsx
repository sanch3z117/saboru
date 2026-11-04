import { MapPin } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { MAP_FRAME_CLASS } from "./map-frame";

export function MapSkeleton({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      data-testid="map-skeleton"
      role="status"
      aria-live="polite"
      className={cn(
        overlay ? "absolute inset-0 z-10 overflow-hidden" : MAP_FRAME_CLASS,
        "flex items-center justify-center",
      )}
    >
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="relative flex flex-col items-center gap-2 rounded-card border-2 border-carbon bg-cream px-5 py-4 text-carbon shadow-hard-sm">
        <MapPin aria-hidden="true" className="size-6 text-antojo" />
        <span className="text-sm font-semibold">Cargando mapa…</span>
        <span className="text-xs text-carbon/60">
          Buscando los locales del campus
        </span>
      </div>
    </div>
  );
}
