import { Suspense } from "react";

import { DiscoverySkeleton } from "@/components/discovery/discovery-skeleton";
import { DiscoverySurface } from "@/components/discovery/discovery-surface";
import { FeaturedBand } from "@/components/home/featured-band";
import { HowItWorks } from "@/components/home/how-it-works";
import { SiteHeader } from "@/components/layout/site-header";
import { SnapshotRefresher } from "@/components/offline/snapshot-refresher";
import { getFeaturedEstablishmentCards } from "@/server/queries/catalog";

export default async function HomePage() {
  const featured = await getFeaturedEstablishmentCards();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <SnapshotRefresher />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <h1 className="max-w-[22ch] font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance text-carbon">
          Qué comer, cuánto cuesta y qué tan lejos queda.
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-carbon/80">
          Descubre, compara y califica dónde comer en tu campus. Busca por
          plato, local o categoría; el mapa y la lista se mueven juntos.
        </p>

        <div className="mt-6">
          <Suspense fallback={<DiscoverySkeleton />}>
            <DiscoverySurface />
          </Suspense>
        </div>

        <FeaturedBand establishments={featured} />
        <HowItWorks />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-6 sm:px-8 sm:pb-8">
        <p className="text-sm text-carbon/70">
          Antojo con criterio. Para la comunidad universitaria de la UPTC,
          Tunja.
        </p>
      </footer>
    </div>
  );
}
