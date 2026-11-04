import { Suspense } from "react";

import { DiscoverySkeleton } from "@/components/discovery/discovery-skeleton";
import { DiscoverySurface } from "@/components/discovery/discovery-surface";
import { FeaturedBand } from "@/components/home/featured-band";
import { HowItWorks } from "@/components/home/how-it-works";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SnapshotRefresher } from "@/components/offline/snapshot-refresher";
import { getFeaturedEstablishmentCards } from "@/server/queries/catalog";

export default async function HomePage() {
  const featured = await getFeaturedEstablishmentCards();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <SnapshotRefresher />

      <main
        id="contenido"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-10 lg:px-10"
      >
        <section className="relative overflow-hidden rounded-card border-2 border-carbon bg-campus px-5 py-7 shadow-hard sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="relative z-10 max-w-3xl">
            <p className="mb-3 inline-flex rounded-pill border-2 border-carbon bg-cream px-3 py-1 text-sm font-semibold text-carbon">
              Antojo con criterio
            </p>
            <h1 className="max-w-[19ch] font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance text-carbon">
              Qué comer, cuánto cuesta y qué tan lejos queda.
            </h1>
            <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-carbon sm:text-lg">
              Descubre, compara y califica dónde comer en tu campus. Busca por
              plato, local o categoría; el mapa y la lista se mueven juntos.
            </p>
          </div>
          <div
            aria-hidden="true"
            className="absolute -right-10 -bottom-24 size-56 rounded-full border-[22px] border-cream/70 sm:-right-2 sm:-bottom-32 sm:size-72 sm:border-[30px]"
          />
        </section>

        <FeaturedBand establishments={featured} />

        <section aria-label="Explora locales y productos" className="mt-10">
          <Suspense fallback={<DiscoverySkeleton />}>
            <DiscoverySurface />
          </Suspense>
        </section>

        <HowItWorks />
      </main>

      <SiteFooter />
    </div>
  );
}
