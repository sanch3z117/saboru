"use client";

import { MapPin, Star } from "lucide-react";
import { useState } from "react";

import { PhotoPlaceholder } from "@/components/catalog/photo-placeholder";
import { formatDistance, formatPrice, formatRating } from "@/lib/format";
import type { MapPlace } from "@/lib/map/places";
import { photoSrc } from "@/lib/photos";

export function MapPopup({ place }: { place: MapPlace }) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = photoSrc(place.photoPath);

  return (
    <div data-testid="map-popup" className="w-64 p-2.5">
      <div className="flex gap-2.5">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-panel border-2 border-carbon bg-cream">
          {src && !imageFailed ? (
            // El popup vive en un root de React aislado (MapLibre); next/image
            // necesita contextos del árbol de Next que aquí no existen.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              loading="lazy"
              className="size-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <PhotoPlaceholder className="size-full border-0" label="Sin foto" />
          )}
        </div>

        <div className="min-w-0 flex-1 pr-3">
          <p className="line-clamp-2 font-display text-sm leading-snug font-semibold text-carbon">
            {place.name}
          </p>
          <p className="text-[11px] text-carbon/60">{place.category}</p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-carbon/75">
            <span className="inline-flex items-center gap-0.5">
              <Star
                aria-hidden="true"
                className="size-3 fill-antojo text-antojo"
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
            <span className="inline-flex items-center gap-0.5">
              <MapPin aria-hidden="true" className="size-3" />
              {formatDistance(place.distanceMeters)}
            </span>
          </div>

          <p className="mt-1 font-display text-xs font-semibold text-carbon">
            {place.priceFromCop
              ? `Desde ${formatPrice(place.priceFromCop)}`
              : "Precio no disponible"}
          </p>
        </div>
      </div>

      <a
        href={`/establecimiento/${place.slug}`}
        className="mt-2 inline-flex h-7 w-full items-center justify-center rounded-pill border-2 border-carbon bg-antojo text-xs font-semibold text-carbon underline-offset-4 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
      >
        Ver ficha
      </a>
    </div>
  );
}
