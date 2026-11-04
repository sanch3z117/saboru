import { Suspense } from "react";

import { EstablishmentCard } from "@/components/catalog/establishment-card";
import { DiscoverySkeleton } from "@/components/discovery/discovery-skeleton";
import { DiscoverySurface } from "@/components/discovery/discovery-surface";
import { SiteHeader } from "@/components/layout/site-header";
import { SnapshotRefresher } from "@/components/offline/snapshot-refresher";
import { getFeaturedEstablishments } from "@/server/queries/catalog";

export default async function HomePage() {
  const featured = await getFeaturedEstablishments();

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

        <section aria-labelledby="destacado" className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="destacado"
              className="font-display text-2xl font-semibold text-carbon"
            >
              Destacado
            </h2>
            <p className="text-sm text-carbon/60">
              Locales patrocinados, fuera del ranking.
            </p>
          </div>

          {featured.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((establishment) => (
                <EstablishmentCard
                  key={establishment.id}
                  establishment={establishment}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-base text-carbon/70">
              Todavía no hay locales destacados.
            </p>
          )}
        </section>
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
