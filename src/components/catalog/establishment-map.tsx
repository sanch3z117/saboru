"use client";

import { useGeolocation } from "@/hooks/use-geolocation";
import type { Coordinates } from "@/lib/catalog/distance";
import type { MapPlace } from "@/lib/map/places";
import type { SnapshotBlock } from "@/types/catalog";

import { CampusMapLoader } from "@/components/map/campus-map-loader";

export function EstablishmentMap({
  place,
  blocks,
  origin,
  describedBy,
}: {
  place: MapPlace;
  blocks: SnapshotBlock[];
  origin: Coordinates;
  describedBy?: string;
}) {
  const geolocation = useGeolocation();

  return (
    <div className="h-[320px] sm:h-[380px]">
      <CampusMapLoader
        places={[place]}
        blocks={blocks}
        origin={origin}
        userPosition={geolocation.position}
        selectedId={place.id}
        onSelect={() => undefined}
        onLocate={geolocation.request}
        locating={geolocation.status === "locating"}
        describedBy={describedBy}
      />
    </div>
  );
}
