import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PhotoPlaceholder } from "@/components/catalog/photo-placeholder";
import { ReviewList } from "@/components/catalog/review-list";
import { StatsSummary } from "@/components/catalog/stats-summary";
import { SiteHeader } from "@/components/layout/site-header";
import { formatSchedule, type WeeklySchedule } from "@/lib/catalog/schedule";
import { formatPrice } from "@/lib/format";
import { getEstablishmentBySlug } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Establecimiento",
};

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEstablishmentBySlug(slug);

  if (!data) {
    notFound();
  }

  const { establishment, products, stats, reviews } = data;
  const schedule = formatSchedule(establishment.schedule as WeeklySchedule);
  const statsByProduct = new Map(
    stats.map((row) => [row.product_id, row] as const),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        <Link
          href="/buscar"
          className="text-sm font-semibold text-carbon underline underline-offset-4"
        >
          Volver a buscar
        </Link>

        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-carbon sm:text-4xl">
            {establishment.name}
          </h1>
          {establishment.plan !== "basic" ? (
            <span className="bg-campus px-2 py-1 text-xs font-semibold text-carbon">
              Destacado
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-sm text-carbon/70">
          {establishment.category} · {establishment.address}
        </p>
        {establishment.description ? (
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-carbon/80">
            {establishment.description}
          </p>
        ) : null}

        <PhotoPlaceholder
          className="mt-6 aspect-[16/6] w-full"
          label="Foto del local próximamente"
        />

        <section aria-labelledby="horario" className="mt-8">
          <h2
            id="horario"
            className="font-display text-2xl font-semibold text-carbon"
          >
            Horario
          </h2>
          {schedule.some((day) => day.ranges.length > 0) ? (
            <dl className="mt-2 grid gap-x-8 text-sm sm:grid-cols-2">
              {schedule.map((day) => (
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

          {products.length === 0 ? (
            <p className="mt-3 text-base text-carbon/70">
              Este local todavía no tiene productos publicados.
            </p>
          ) : (
            <ul className="mt-4">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="grid gap-2 border-b border-carbon/15 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline"
                >
                  <div>
                    <h3 className="font-display text-lg font-semibold text-carbon">
                      <Link
                        href={`/producto/${product.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {product.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-carbon/70">
                      {product.category}
                    </p>
                    <StatsSummary
                      stats={statsByProduct.get(product.id)}
                      className="mt-1"
                    />
                  </div>
                  <p className="font-display text-lg font-semibold sm:text-right">
                    {formatPrice(product.price_cop)}
                  </p>
                </li>
              ))}
            </ul>
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
    </div>
  );
}
