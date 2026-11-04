import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { isOpenAt } from "@/lib/catalog/schedule";
import type { EstablishmentCardData } from "@/lib/catalog/cards";
import { formatDistance, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Photo } from "./photo";
import { RatingStars } from "./rating-stars";

export function EstablishmentCard({
  establishment,
  variant = "default",
  className,
}: {
  establishment: EstablishmentCardData;
  variant?: "default" | "featured";
  className?: string;
}) {
  const open = establishment.schedule
    ? isOpenAt(establishment.schedule, new Date())
    : null;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-card border-2 border-carbon bg-cream",
        variant === "featured" && "shadow-hard",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden border-b-2 border-carbon bg-cream",
          variant === "featured" ? "aspect-[4/3]" : "aspect-[16/10]",
        )}
      >
        <Photo
          path={establishment.photoPath}
          alt={`Foto de ${establishment.name}`}
          sizes={variant === "featured" ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 640px) 100vw, 33vw"}
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {establishment.plan !== "basic" ? (
            <Badge tone="campus">Destacado</Badge>
          ) : null}
          {establishment.status === "active" ? (
            <Badge tone="outline">Activo</Badge>
          ) : null}
        </div>

        <h3 className="mt-2 font-display text-xl leading-snug font-semibold text-carbon">
          <Link
            href={`/establecimiento/${establishment.slug}`}
            className="underline-offset-4 hover:underline"
          >
            {establishment.name}
          </Link>
        </h3>

        <p className="mt-1 text-sm text-carbon/65">
          {establishment.category}
          {establishment.distanceMeters !== null ? (
            <>
              {" "}
              ·{" "}
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {formatDistance(establishment.distanceMeters)}
              </span>
            </>
          ) : null}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <RatingStars
            value={establishment.rating}
            reviewCount={establishment.reviewCount}
          />
          <span className="inline-flex items-center gap-1 text-xs text-carbon/60">
            <Clock aria-hidden="true" className="size-3.5" />
            {open === null
              ? "Horario por confirmar"
              : open
                ? "Abierto ahora"
                : "Cerrado"}
          </span>
        </div>

        {establishment.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-carbon/70">
            {establishment.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="font-display text-lg font-semibold text-carbon">
            {establishment.priceFromCop !== null
              ? `Desde ${formatPrice(establishment.priceFromCop)}`
              : "Precio no disponible"}
          </p>
          <Link
            href={`/establecimiento/${establishment.slug}`}
            className="inline-flex h-9 items-center justify-center rounded-pill border-2 border-carbon bg-antojo px-3 text-sm font-semibold text-carbon underline-offset-4 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
          >
            Ver ficha
          </Link>
        </div>
      </div>
    </article>
  );
}
