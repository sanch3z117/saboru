import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import { CriteriaRatings } from "@/components/catalog/criteria-ratings";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { Photo } from "@/components/catalog/photo";
import { RatingStars } from "@/components/catalog/rating-stars";
import { ReviewList } from "@/components/catalog/review-list";
import { StatsSummary } from "@/components/catalog/stats-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ViewerCache } from "@/components/offline/viewer-cache";
import { ReviewForm } from "@/components/reviews/review-form";
import { distanceMeters } from "@/lib/catalog/distance";
import { formatDistance, formatPrice } from "@/lib/format";
import { CAMPUS_CENTER } from "@/lib/map/config";
import { isWithinReviewWindow } from "@/lib/reviews/window";
import { statsAverage } from "@/lib/reviews/stats";
import {
  getDefaultBlockLocation,
  getProductById,
} from "@/server/queries/catalog";
import { getFavoriteContext } from "@/server/queries/favorites";
import { getReviewContext } from "@/server/queries/reviews";
import { logProductView } from "@/server/services/catalog-events";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getProductById(id);
  if (!data) return { title: "Producto" };

  const { product, establishment } = data;
  const description =
    product.description ||
    `${product.name}${establishment ? ` en ${establishment.name}` : ""}.`;
  return {
    title: product.name,
    description,
    openGraph: {
      title: `${product.name} · SaborU`,
      description,
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProductById(id);

  if (!data) {
    notFound();
  }

  const { product, establishment, stats, reviews } = data;
  const [reviewContext, block, favorite] = await Promise.all([
    getReviewContext(product.id),
    getDefaultBlockLocation(),
    getFavoriteContext({
      establishmentId: product.establishment_id,
      productId: product.id,
    }),
  ]);
  const editableReview =
    reviewContext.ownReview &&
    isWithinReviewWindow(reviewContext.ownReview.created_at)
      ? reviewContext.ownReview
      : null;
  const origin =
    block && block.latitude !== null && block.longitude !== null
      ? { latitude: block.latitude, longitude: block.longitude }
      : CAMPUS_CENTER;
  const distance =
    establishment &&
    establishment.latitude !== null &&
    establishment.longitude !== null
      ? distanceMeters(origin, {
          latitude: establishment.latitude,
          longitude: establishment.longitude,
        })
      : null;
  const rating = statsAverage(stats);
  const reviewCount = stats?.review_count ?? 0;

  await logProductView(product.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <ViewerCache viewer={reviewContext.viewer} />

      <main
        id="contenido"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-10"
      >
        {establishment ? (
          <Link
            href={`/establecimiento/${establishment.slug}`}
            className="text-sm font-semibold text-carbon underline underline-offset-4"
          >
            {establishment.name}
          </Link>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="outline">
            {product.available ? "Disponible" : "Agotado"}
          </Badge>
          <span className="text-sm text-carbon/65">{product.category}</span>
        </div>

        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-carbon sm:text-4xl">
          {product.name}
        </h1>

        <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
          <p className="font-display text-4xl leading-none font-semibold text-carbon">
            {formatPrice(product.price_cop)}
          </p>
          {establishment ? (
            <span className="text-sm text-carbon/70">
              {establishment.name}
              {distance !== null
                ? ` · ${formatDistance(distance)} desde ${block?.name ?? "el bloque de referencia"}`
                : ""}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <RatingStars value={rating} reviewCount={reviewCount} />
          {distance !== null ? (
            <span className="inline-flex items-center gap-1 text-sm text-carbon/65">
              <MapPin aria-hidden="true" className="size-3.5" />
              {formatDistance(distance)}
            </span>
          ) : null}
        </div>

        <div className="relative mt-5 aspect-[16/8] w-full overflow-hidden rounded-card border-2 border-carbon bg-cream">
          <Photo
            path={product.photo_url}
            alt={`Foto de ${product.name}`}
            sizes="(max-width: 1024px) 100vw, 960px"
            priority
            placeholderLabel="Foto del producto próximamente"
          />
        </div>

        <p className="mt-4 max-w-[64ch] text-base leading-relaxed text-carbon/80">
          {product.description}
        </p>

        {product.allergens.length > 0 ? (
          <p className="mt-2 text-sm text-carbon/70">
            Alérgenos: {product.allergens.join(", ")}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {favorite.canFavorite && favorite.userId ? (
            <FavoriteButton
              userId={favorite.userId}
              establishmentId={product.establishment_id}
              productId={product.id}
              initialSaved={favorite.saved}
              serverAvailable
            />
          ) : null}
          <Button asChild variant="outline">
            <a href="#escribir">Calificar</a>
          </Button>
        </div>

        <section aria-labelledby="stats" className="mt-8">
          <h2 id="stats" className="font-display text-xl font-semibold">
            Calificación
          </h2>
          <div className="mt-2">
            <StatsSummary stats={stats} />
            {stats && (stats.review_count ?? 0) >= 5 ? (
              <CriteriaRatings stats={stats} />
            ) : null}
          </div>
        </section>

        <section aria-labelledby="escribir" className="mt-8">
          <h2 id="escribir" className="font-display text-xl font-semibold">
            {editableReview ? "Edita tu reseña" : "Escribe tu reseña"}
          </h2>

          {reviewContext.canReview ? (
            <ReviewForm
              mode={editableReview ? "edit" : "create"}
              productId={product.id}
              establishmentId={product.establishment_id}
              establishmentSlug={establishment?.slug}
              reviewId={editableReview?.id}
              initial={
                editableReview
                  ? {
                      rating_sabor: editableReview.rating_sabor,
                      rating_cantidad: editableReview.rating_cantidad,
                      rating_precio: editableReview.rating_precio,
                      rating_presentacion: editableReview.rating_presentacion,
                      rating_calidad_precio:
                        editableReview.rating_calidad_precio,
                      comment: editableReview.comment,
                    }
                  : undefined
              }
            />
          ) : reviewContext.hasSession ? (
            <p className="mt-3 text-base text-carbon/75">
              Solo estudiantes institucionales de la UPTC pueden reseñar.
            </p>
          ) : (
            <p className="mt-3 text-base text-carbon/75">
              <Link
                href="/login"
                className="font-semibold text-carbon underline underline-offset-4"
              >
                Entra con tu correo UPTC
              </Link>{" "}
              para calificar este producto.
            </p>
          )}
        </section>

        <section aria-labelledby="resenas" className="mt-8">
          <h2 id="resenas" className="font-display text-xl font-semibold">
            Reseñas
          </h2>
          <ReviewList
            reviews={reviews}
            canReport={reviewContext.canReview}
            ownReviewIds={
              reviewContext.ownReview ? [reviewContext.ownReview.id] : []
            }
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
