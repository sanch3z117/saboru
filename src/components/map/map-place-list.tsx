import { MapPin, Star } from "lucide-react";
import Link from "next/link";

import { formatDistance, formatPrice, formatRating } from "@/lib/format";
import type { MapPlace } from "@/lib/map/places";

export function MapPlaceList({ places }: { places: readonly MapPlace[] }) {
  if (places.length === 0) return null;

  return (
    <div id="mapa-lista" data-testid="map-place-list" className="mt-4">
      <h3 className="font-display text-base font-semibold text-carbon">
        Locales en el mapa
      </h3>
      <ul className="mt-2 divide-y divide-carbon/15 border-y border-carbon/15">
        {places.map((place) => (
          <li
            key={place.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
          >
            <Link
              href={`/establecimiento/${place.slug}`}
              className="font-semibold text-carbon underline-offset-4 hover:underline"
            >
              {place.name}
            </Link>
            <span className="text-carbon/55">{place.category}</span>
            <span className="inline-flex items-center gap-1 text-carbon/75">
              <Star
                aria-hidden="true"
                className="size-3.5 fill-antojo text-antojo"
              />
              {place.rating ? (
                <>
                  {formatRating(place.rating)}
                  <span className="text-carbon/50">({place.reviewCount})</span>
                </>
              ) : (
                "Sin reseñas"
              )}
            </span>
            <span className="text-carbon/75">
              {place.priceFromCop
                ? `Desde ${formatPrice(place.priceFromCop)}`
                : "Precio no disponible"}
            </span>
            <span className="inline-flex items-center gap-1 text-carbon/75">
              <MapPin aria-hidden="true" className="size-3.5" />
              {formatDistance(place.distanceMeters)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
