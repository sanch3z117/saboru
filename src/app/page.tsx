import { EstablishmentCard } from "@/components/catalog/establishment-card";
import { SearchForm } from "@/components/catalog/search-form";
import { SiteHeader } from "@/components/layout/site-header";
import { CampusMapSection } from "@/components/map/campus-map-section";
import { SnapshotRefresher } from "@/components/offline/snapshot-refresher";
import {
  getBlocks,
  getCategories,
  getDefaultBlock,
  getFeaturedEstablishments,
} from "@/server/queries/catalog";

export default async function HomePage() {
  const [blocks, categories, defaultBlock, featured] = await Promise.all([
    getBlocks(),
    getCategories(),
    getDefaultBlock(),
    getFeaturedEstablishments(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <SnapshotRefresher />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="max-w-[18ch] font-display text-[clamp(2.25rem,7vw,4.25rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance text-carbon">
          Qué comer, cuánto cuesta y qué tan lejos queda.
        </h1>
        <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-carbon/80 sm:text-lg">
          Descubre, compara y califica dónde comer en tu campus. Precio,
          distancia y reseñas de otros estudiantes, antes de salir del bloque.
        </p>

        <section
          aria-labelledby="buscar-titulo"
          className="mt-10 bg-campus px-5 py-6 text-carbon sm:px-6"
        >
          <h2 id="buscar-titulo" className="font-display text-lg font-semibold">
            Busca por presupuesto y cercanía
          </h2>
          <div className="mt-4">
            <SearchForm
              blocks={blocks}
              categories={categories}
              defaults={{ blockId: defaultBlock?.id }}
            />
          </div>
        </section>

        <CampusMapSection />

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

      <footer className="mx-auto w-full max-w-5xl px-5 pb-6 sm:px-8 sm:pb-8">
        <p className="text-sm text-carbon/70">
          Antojo con criterio. Para la comunidad universitaria de la UPTC,
          Tunja.
        </p>
      </footer>
    </div>
  );
}
