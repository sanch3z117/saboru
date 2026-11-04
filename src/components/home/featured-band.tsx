import { EstablishmentCard } from "@/components/catalog/establishment-card";
import type { EstablishmentCardData } from "@/lib/catalog/cards";

export function FeaturedBand({
  establishments,
}: {
  establishments: EstablishmentCardData[];
}) {
  const [lead, ...rest] = establishments;

  return (
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

      {lead ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <EstablishmentCard establishment={lead} variant="featured" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {rest.slice(0, 2).map((establishment) => (
              <EstablishmentCard
                key={establishment.id}
                establishment={establishment}
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
