import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PhotoPlaceholder } from "@/components/catalog/photo-placeholder";
import { ReviewList } from "@/components/catalog/review-list";
import { StatsSummary } from "@/components/catalog/stats-summary";
import { SiteHeader } from "@/components/layout/site-header";
import { formatPrice } from "@/lib/format";
import { getProductById } from "@/server/queries/catalog";
import { logProductView } from "@/server/services/catalog-events";

export const metadata: Metadata = {
  title: "Producto",
};

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

  await logProductView(product.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        {establishment ? (
          <Link
            href={`/establecimiento/${establishment.slug}`}
            className="text-sm font-semibold text-carbon underline underline-offset-4"
          >
            {establishment.name}
          </Link>
        ) : null}

        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-carbon sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-2 text-base text-carbon/75">{product.description}</p>

        <div className="mt-4 flex flex-wrap items-baseline gap-4">
          <p className="font-display text-2xl font-semibold text-carbon">
            {formatPrice(product.price_cop)}
          </p>
          <p className="text-sm text-carbon/70">{product.category}</p>
        </div>

        {product.allergens.length > 0 ? (
          <p className="mt-3 text-sm text-carbon/70">
            Alérgenos: {product.allergens.join(", ")}
          </p>
        ) : null}

        <PhotoPlaceholder
          className="mt-6 aspect-[16/6] w-full"
          label="Foto del producto próximamente"
        />

        <section aria-labelledby="stats" className="mt-8">
          <h2 id="stats" className="font-display text-xl font-semibold">
            Calificación
          </h2>
          <StatsSummary stats={stats} className="mt-2" />
        </section>

        <section aria-labelledby="resenas" className="mt-8">
          <h2 id="resenas" className="font-display text-xl font-semibold">
            Reseñas
          </h2>
          <ReviewList reviews={reviews} />
        </section>
      </main>
    </div>
  );
}
