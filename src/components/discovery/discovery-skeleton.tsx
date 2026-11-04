import { Skeleton } from "@/components/ui/skeleton";
import { MapSkeleton } from "@/components/map/map-skeleton";
import { cn } from "@/lib/utils";

import {
  DISCOVERY_GRID_CLASS,
  DISCOVERY_MAP_FRAME_CLASS,
} from "./discovery-layout";

export function DiscoverySkeleton() {
  return (
    <div aria-label="Cargando descubrimiento" aria-busy="true">
      <div className="border-y-2 border-carbon bg-cream py-3">
        <Skeleton className="h-11 w-full rounded-card" />
        <div className="mt-3 flex gap-2">
          {[64, 88, 72, 96].map((width) => (
            <Skeleton
              key={width}
              className="h-8 rounded-pill"
              style={{ width }}
            />
          ))}
        </div>
      </div>

      <div className={cn(DISCOVERY_GRID_CLASS, "mt-4")}>
        <div className={DISCOVERY_MAP_FRAME_CLASS}>
          <MapSkeleton />
        </div>
        <div className="space-y-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-hidden">
          <Skeleton className="h-6 w-32" />
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-card border-2 border-carbon/20"
            >
              <Skeleton className="h-full min-h-[132px] rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
