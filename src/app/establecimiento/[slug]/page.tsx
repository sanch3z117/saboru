import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin, Navigation } from "lucide-react";

import { EstablishmentMap } from "@/components/catalog/establishment-map";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { Photo } from "@/components/catalog/photo";
import { ProductCard } from "@/components/catalog/product-card";
import { RatingStars } from "@/components/catalog/rating-stars";
import { ReviewList } from "@/components/catalog/review-list";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import {
  scheduleFromJson,
  type ProductCardData,
} from "@/lib/catalog/cards";
import { distanceMeters } from "@/lib/catalog/distance";
import { aggregateEstablishmentRating } from "@/lib/catalog/rating";
import { isOpenAt, formatSchedule } from "@/lib/catalog/schedule";
import { formatDistance, formatPrice } from "@/lib/format";
import { CAMPUS_CENTER } from "@/lib/map/config";
import type { MapPlace } from "@/lib/map/places";
import { statsAverage } from "@/lib/reviews/stats";
import { getFavoriteContext } from "@/server/queries/favorites";
import {
  getBlocksWithLocation,
  getDefaultBlockLocation,
  getEstablishmentBySlug,
} from "@/server/queries/catalog";
import type { ProductStatsRow } from "@/types/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEstablishmentBySlug(slug);
  if (!data) return { title: "Establecimiento" };

  const { establishment } = data;
  return {
    title: establishment.name,
    description:
      establishment.description ||
      `${establishment.name} en el campus de la UPTC.`,
    openGraph: {
      title: `${establishment.name} · SaborU`,
      description:
        establishment.description ||
        `${establishment.name} en el campus de la UPTC.`,
      type: "website",
    },
  };
}

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [data, blocks, block] = await Promise.all([
    getEstablishmentBySlug(slug),
    getBlocksWithLocation(),
    getDefaultBlockLocation(),
  ]);

  if (!data) {
    notFound();
  }

  const { establishment, products, stats, reviews } = data;
  const favorite = await getFavoriteContext({
    establishmentId: establishment.id,
    productId: null,
  });
  const schedule = scheduleFromJson(establishment.schedule);
  const formattedSchedule = formatSchedule(schedule);
  const open = schedule ? isOpenAt(schedule, new Date()) : null;
  const origin =
    block && block.latitude !== null && block.longitude !== null
      ? { latitude: block.latitude, longitude: block.longitude }
      : CAMPUS_CENTER;
  const hasLocation =
    establishment.latitude !== null && establishment.longitude !== null;
  const distance = hasLocation
    ? distanceMeters(origin, {
        latitude: establishment.latitude as number,
        longitude: establishment.longitude as number,
      })
    : null;

  const productIds = new Set(products.map((product) => product.id));
  const aggregate = aggregateEstablishmentRating(stats, productIds);
  const statsByProduct = new Map(
    stats.map((row) => [row.product_id, row] as const),
  );
  const priceFrom =
    products.filter((product) => product.available).length > 0
      ? Math.min(
          ...products
            .filter((product) => product.available)
            .map((product) => product.price_cop),
        )
      : null;

  const place: MapPlace | null = hasLocation
    ? {
        id: establishment.id,
        slug: establishment.slug,
        name: establishment.name,
        category: establishment.category,
        plan: establishment.plan,
        latitude: establishment.latitude as number,
        longitude: establishment.longitude as number,
        photoPath: establishment.photos?.[0] ?? null,
        priceFromCop: priceFrom,
        rating: aggregate.rating,
        reviewCount: aggregate.reviewCount,
        distanceMeters: distance ?? 0,
      }
    : null;

  const productCards: ProductCardData[] = products.map((product) => {
    const productStats: ProductStatsRow | undefined = statsByProduct.get(
      product.id,
    );
    return {
      id: product.id,
      establishmentId: establishment.id,
      establishmentSlug: establishment.slug,
      establishmentName: establishment.name,
      name: product.name,
      description: product.description,
      category: product.category,
      priceCop: product.price_cop,
      photoPath: product.photo_url,
      available: product.available,
      schedule,
      distanceMeters: distance,
      rating: statsAverage(productStats),
      reviewCount: productStats?.review_count ?? 0,
      allergens: product.allergens,
    };
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main
        id="contenido"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-10"
      >
        <Link
          href="/buscar"
          className="text-sm font-semibold text-carbon underline underline-offset-4"
        >
          Volver a buscar
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {establishment.plan !== "basic" ? (
            <Badge tone="campus">Destacado</Badge>
          ) : null}
          {establishment.status === "active" ? (
            <Badge tone="outline">Activo</Badge>
          ) : null}
          {establishment.photos.length > 0 ? (
            <Badge tone="outline">
              <CheckCircle2 aria-hidden="true" className="size-3" />
              Fotos del local
            </Badge>
          ) : null}
        </div>

        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-carbon sm:text-4xl">
          {establishment.name}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-carbon/70">
          <span>{establishment.category}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-3.5" />
            {establishment.address}
          </span>
          {distance !== null ? (
            <span>
              {formatDistance(distance)} desde{" "}
              {block?.name ?? "el bloque de referencia"}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            {open === null
              ? "Horario por confirmar"
              : open
                ? "Abierto ahora"
                : "Cerrado"}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <RatingStars
            value={aggregate.rating}
            reviewCount={aggregate.reviewCount}
          />
          {priceFrom !== null ? (
            <span className="font-display text-lg font-semibold text-carbon">
              Desde {formatPrice(priceFrom)}
            </span>
          ) : null}
        </div>

        {favorite.canFavorite && favorite.userId ? (
          <FavoriteButton
            userId={favorite.userId}
            establishmentId={establishment.id}
            productId={null}
            initialSaved={favorite.saved}
            serverAvailable
          />
        ) : null}

        <div className="relative mt-5 aspect-[16/8] w-full overflow-hidden rounded-card border-2 border-carbon bg-cream">
          <Photo
            path={establishment.photos?.[0]}
            alt={`Foto de ${establishment.name}`}
            sizes="(max-width: 1024px) 100vw, 960px"
            priority
            placeholderLabel="Foto del local próximamente"
          />
        </div>

        {establishment.description ? (
          <p className="mt-4 max-w-[64ch] text-base leading-relaxed text-carbon/80">
            {establishment.description}
          </p>
        ) : null}

        {place ? (
          <section aria-labelledby="mapa-local" className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2
                id="mapa-local"
                className="font-display text-2xl font-semibold text-carbon"
              >
                Mapa y cómo llegar
              </h2>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-carbon underline underline-offset-4"
              >
                <Navigation aria-hidden="true" className="size-4" />
                Cómo llegar
              </a>
            </div>
            <p className="mt-1 text-sm text-carbon/60">
              {formatDistance(distance ?? 0)} desde{" "}
              {block?.name ?? "el bloque de referencia"}.
            </p>
            <div className="mt-3">
              <EstablishmentMap
                place={place}
                blocks={blocks}
                origin={origin}
                describedBy="mapa-local"
              />
            </div>
          </section>
        ) : null}

        <section aria-labelledby="horario" className="mt-8">
          <h2
            id="horario"
            className="font-display text-2xl font-semibold text-carbon"
          >
            Horario
          </h2>
          {formattedSchedule.some((day) => day.ranges.length > 0) ? (
            <dl className="mt-2 grid gap-x-8 text-sm sm:grid-cols-2">
              {formattedSchedule.map((day) => (
                <div
                  key={day.key}
                  className="flex items-baseline justify-between gap-4 border-b border-carbon/10 py-1.5"
                >
                  <dt className="text-carbon/70">{day.label}</dt>
                  <dd className="tabular-nums text-carbon">
                    {day.ranges.length > 0 ? day.ranges.join(" · ") : "Cerrado"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-base text-carbon/70">
              Horario por confirmar.
            </p>
          )}
          <p className="mt-2 text-xs text-carbon/55">
            Hora de Bogotá. El catálogo usa este horario para “abierto ahora”.
          </p>
        </section>

        <section aria-labelledby="productos" className="mt-10">
          <h2
            id="productos"
            className="font-display text-2xl font-semibold text-carbon"
          >
            Productos
          </h2>
          {productCards.length === 0 ? (
            <p className="mt-3 text-base text-carbon/70">
              Este local todavía no tiene productos publicados.
            </p>
          ) : (
            <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
              {productCards.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="resenas" className="mt-10">
          <h2
            id="resenas"
            className="font-display text-2xl font-semibold text-carbon"
          >
            Reseñas
          </h2>
          <ReviewList reviews={reviews} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
