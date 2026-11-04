import { ImageResponse } from "next/og";

import { aggregateEstablishmentRating } from "@/lib/catalog/rating";
import { formatPrice, formatRating } from "@/lib/format";
import { OgCard, fetchOgPhoto } from "@/lib/og";
import { getEstablishmentBySlug } from "@/server/queries/catalog";

export const alt = "Local del campus en SaborU";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEstablishmentBySlug(slug);

  if (!data) {
    return new ImageResponse(
      <OgCard
        title="SaborU"
        subtitle="Campus UPTC"
        meta="Antojo con criterio."
        photo={null}
      />,
      size,
    );
  }

  const { establishment, products, stats } = data;
  const productIds = new Set(products.map((product) => product.id));
  const aggregate = aggregateEstablishmentRating(stats, productIds);
  const price =
    products.filter((product) => product.available).length > 0
      ? Math.min(
          ...products
            .filter((product) => product.available)
            .map((product) => product.price_cop),
        )
      : null;
  const meta = [
    establishment.category,
    price !== null ? `Desde ${formatPrice(price)}` : null,
    aggregate.rating !== null
      ? `${formatRating(aggregate.rating)} de 5`
      : "Sin reseñas suficientes",
  ]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    <OgCard
      title={establishment.name}
      subtitle="Local del campus"
      meta={meta}
      photo={await fetchOgPhoto(establishment.photos?.[0])}
    />,
    size,
  );
}
