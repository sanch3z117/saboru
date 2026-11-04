import { EstablishmentCard } from "@/components/catalog/establishment-card";
import type { EstablishmentCardData } from "@/lib/catalog/cards";

export function FeaturedBand({
  establishments,
}: {
  establishments: EstablishmentCardData[];
}) {
  const [lead, ...rest] = establishments;

  return (
    <section aria-labelledby="destacado" className="mt-12 sm:mt-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-carbon pb-3">
        <h2
          id="destacado"
          className="font-display text-2xl font-semibold text-carbon sm:text-3xl"
        >
          Destacado
        </h2>
        <p className="max-w-[42ch] text-sm leading-relaxed text-carbon/70">
          Locales patrocinados, fuera del ranking.
        </p>
      </div>

      {lead ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[1.25fr_1fr_1fr] lg:items-stretch">
          <EstablishmentCard
            establishment={lead}
            variant="band"
            className="w-[84vw] max-w-sm shrink-0 snap-start shadow-hard sm:col-span-2 sm:w-auto sm:max-w-none lg:col-span-1 lg:h-full"
          />
          <div className="flex shrink-0 gap-4 sm:col-span-2 sm:grid sm:grid-cols-2 lg:contents">
            {rest.slice(0, 2).map((establishment) => (
              <EstablishmentCard
                key={establishment.id}
                establishment={establishment}
                variant="band"
                className="w-[76vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none lg:h-full"
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-base text-carbon/70">
          Todavía no hay locales destacados.
        </p>
      )}
    </section>
  );
}
