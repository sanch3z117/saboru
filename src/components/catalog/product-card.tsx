import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ProductCardData } from "@/lib/catalog/cards";
import { isOpenAt } from "@/lib/catalog/schedule";
import { formatDistance, formatPrice } from "@/lib/format";

import { Photo } from "./photo";
import { RatingStars } from "./rating-stars";

export function ProductCard({ product }: { product: ProductCardData }) {
  const open = product.schedule
    ? isOpenAt(product.schedule, new Date())
    : null;

  return (
    <article className="flex gap-3 border-b border-carbon/15 py-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-panel border-2 border-carbon bg-cream">
        <Photo
          path={product.photoPath}
          alt={`Foto de ${product.name}`}
          sizes="96px"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="outline" size="sm">
            {product.available ? "Disponible" : "Agotado"}
          </Badge>
        </div>
        <h3 className="mt-1 font-display text-lg leading-snug font-semibold text-carbon">
          <Link
            href={`/producto/${product.id}`}
            className="underline-offset-4 hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-carbon/65">
          {product.category}
          {product.distanceMeters !== null ? (
            <>
              {" "}
              ·{" "}
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {formatDistance(product.distanceMeters)}
              </span>
            </>
          ) : null}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <RatingStars
            value={product.rating}
            reviewCount={product.reviewCount}
            size="sm"
          />
          <span className="inline-flex items-center gap-1 text-xs text-carbon/60">
            <Clock aria-hidden="true" className="size-3.5" />
            {open === null
              ? "Horario por confirmar"
              : open
                ? "Abierto"
                : "Cerrado"}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <p className="font-display text-lg font-semibold text-carbon">
            {formatPrice(product.priceCop)}
          </p>
          <Link
            href={`/producto/${product.id}`}
            className="text-sm font-semibold text-carbon underline underline-offset-4 hover:no-underline"
          >
            Ver producto
          </Link>
        </div>
      </div>
    </article>
  );
}
