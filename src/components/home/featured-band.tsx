import { EstablishmentCard } from "@/components/catalog/establishment-card";
import type { EstablishmentCardData } from "@/lib/catalog/cards";

export function FeaturedBand({
  establishments,
}: {
  establishments: EstablishmentCardData[];
}) {
  const [lead, ...rest] = establishments;

  return (
    <section aria-labelledby="destacado" className="mt-10">
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

      {lead ? (
        <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-[1.35fr_1fr_1fr] lg:items-stretch">
          <EstablishmentCard
            establishment={lead}
            variant="band"
            className="w-[82vw] max-w-md shrink-0 snap-start shadow-hard sm:col-span-2 sm:w-auto sm:max-w-none lg:col-span-1 lg:h-full"
          />
          <div className="flex shrink-0 gap-4 sm:col-span-2 sm:grid sm:grid-cols-2 lg:contents">
            {rest.slice(0, 2).map((establishment) => (
              <EstablishmentCard
                key={establishment.id}
                establishment={establishment}
                variant="band"
                className="w-[70vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none lg:h-full"
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
