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
  onSelect,
  selected = false,
}: {
  establishment: EstablishmentCardData;
  variant?: "default" | "featured" | "list" | "band";
  className?: string;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const open = establishment.schedule
    ? isOpenAt(establishment.schedule, new Date())
    : null;
  const isList = variant === "list";
  const isBand = variant === "band";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-card border-2 border-carbon bg-cream",
        isList
          ? "grid grid-cols-[104px_minmax(0,1fr)] sm:grid-cols-[160px_minmax(0,1fr)]"
          : "flex flex-col",
        isBand && "h-full",
        variant === "featured" && "shadow-hard",
        selected && "ring-2 ring-antojo ring-offset-2 ring-offset-cream",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-cream",
          isList
            ? "h-full min-h-[148px] border-r-2 border-carbon"
            : isBand
              ? "h-44 w-full border-b-2 border-carbon sm:h-48"
              : cn(
                  "w-full border-b-2 border-carbon",
                  variant === "featured" ? "aspect-[4/3]" : "aspect-[16/10]",
                ),
        )}
      >
        <Photo
          path={establishment.photoPath}
          alt={`Foto de ${establishment.name}`}
          sizes={
            isList
              ? "(max-width: 640px) 104px, 160px"
              : variant === "featured"
                ? "(max-width: 1024px) 100vw, 50vw"
                : "(max-width: 640px) 100vw, 33vw"
          }
        />

        {onSelect ? (
          <button
            type="button"
            aria-label={`Ver ${establishment.name} en el mapa`}
            aria-pressed={selected}
            onClick={onSelect}
            className={cn(
              "absolute bottom-2 left-2 z-10 inline-flex items-center justify-center gap-1 rounded-pill border-2 border-carbon bg-cream/95 text-xs font-semibold text-carbon shadow-hard-sm hover:bg-campus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon",
              isList ? "size-10" : "h-8 px-2.5",
            )}
          >
            <MapPin aria-hidden="true" className="size-3.5" />
            {isList ? null : selected ? "Seleccionado" : "Ver en mapa"}
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isList ? "p-3 sm:p-4" : "p-4",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {establishment.plan !== "basic" ? (
            <Badge tone="campus">Destacado</Badge>
          ) : null}
          {establishment.status === "active" ? (
            <Badge tone="outline">Activo</Badge>
          ) : null}
        </div>

        <h3
          className={cn(
            "mt-2 font-display leading-snug font-semibold text-carbon",
            isList || isBand ? "text-lg" : "text-xl",
          )}
        >
          <Link
            href={`/establecimiento/${establishment.slug}`}
            className="underline-offset-4 hover:underline"
          >
            {establishment.name}
          </Link>
        </h3>

        <p
          className={cn(
            "mt-1 text-carbon/65",
            isList ? "text-xs sm:text-sm" : "text-sm",
          )}
        >
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
            size={isList ? "sm" : "md"}
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

        {!isList && establishment.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-carbon/70">
            {establishment.description}
          </p>
        ) : null}

        <div
          className={cn(
            "mt-auto flex items-end justify-between gap-3",
            isList ? "pt-2" : "pt-4",
          )}
        >
          <p
            className={cn(
              "font-display font-semibold text-carbon",
              isList ? "text-sm sm:text-base" : "text-lg",
            )}
          >
            {establishment.priceFromCop !== null
              ? `Desde ${formatPrice(establishment.priceFromCop)}`
              : "Precio no disponible"}
          </p>
          <Link
            href={`/establecimiento/${establishment.slug}`}
            className={cn(
              "inline-flex items-center justify-center rounded-pill border-2 border-carbon bg-antojo font-semibold text-carbon underline-offset-4 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon",
              isList
                ? "h-8 px-2 sm:h-9 sm:px-3 sm:text-sm"
                : "h-9 px-3 text-sm",
            )}
          >
            Ver ficha
          </Link>
        </div>
      </div>
    </article>
  );
}
