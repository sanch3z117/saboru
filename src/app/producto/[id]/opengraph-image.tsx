import { ImageResponse } from "next/og";

import { formatPrice, formatRating } from "@/lib/format";
import { OgCard, fetchOgPhoto } from "@/lib/og";
import { statsAverage } from "@/lib/reviews/stats";
import { getProductById } from "@/server/queries/catalog";

export const alt = "Producto del campus en SaborU";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProductById(id);

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

  const { product, establishment, stats } = data;
  const rating = statsAverage(stats);
  const meta = [
    formatPrice(product.price_cop),
    establishment?.name ?? null,
    rating !== null ? `${formatRating(rating)} de 5` : "Sin reseñas suficientes",
  ]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    <OgCard
      title={product.name}
      subtitle={product.category}
      meta={meta}
      photo={await fetchOgPhoto(product.photo_url)}
    />,
    size,
  );
}
