import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoverySkeleton } from "@/components/discovery/discovery-skeleton";
import { DiscoverySurface } from "@/components/discovery/discovery-surface";
import { SiteHeader } from "@/components/layout/site-header";
import { SnapshotRefresher } from "@/components/offline/snapshot-refresher";
import { parseBudgetValue } from "@/lib/catalog/discovery";
import { logSearchEvent } from "@/server/services/catalog-events";

export const metadata: Metadata = {
  title: "Buscar",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const budget = parseBudgetValue(firstValue(params.presupuesto));
  const category = firstValue(params.categoria)?.trim().slice(0, 50) || null;

  // Analítica best-effort: nunca bloquea el render ni valida un bloque que
  // pueda no existir. El descubrimiento usa el centro/bloque por defecto.
  try {
    await logSearchEvent({ budget, blockId: null, category });
  } catch {
    // Un fallo de analítica no debe romper la búsqueda.
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <SnapshotRefresher />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-carbon sm:text-4xl">
          Descubrir
        </h1>
        <p className="mt-2 max-w-[58ch] text-base text-carbon/70">
          Busca, filtra y compara los locales del campus. El mapa y la lista
          usan los mismos filtros.
        </p>

        <div className="mt-6">
          <Suspense fallback={<DiscoverySkeleton />}>
            <DiscoverySurface />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
