import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/catalog/empty-state";
import { Pagination } from "@/components/catalog/pagination";
import { ProductRow } from "@/components/catalog/product-row";
import { SearchForm } from "@/components/catalog/search-form";
import { SiteHeader } from "@/components/layout/site-header";
import { SnapshotRefresher } from "@/components/offline/snapshot-refresher";
import { paginate, searchCatalog } from "@/lib/catalog/search";
import {
  getBlocks,
  getCategories,
  getDefaultBlock,
  searchProducts,
} from "@/server/queries/catalog";
import { logSearchEvent } from "@/server/services/catalog-events";

export const metadata: Metadata = {
  title: "Buscar",
};

const PAGE_SIZE = 12;
const RADIUS_M = 5000;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseBudget(value: string | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const [blocks, defaultBlock] = await Promise.all([
    getBlocks(),
    getDefaultBlock(),
  ]);

  const requestedBlock = firstValue(params.bloque);
  const blockId =
    blocks.find((block) => block.id === requestedBlock)?.id ??
    defaultBlock?.id ??
    null;

  const budget = parseBudget(firstValue(params.presupuesto));
  const category = firstValue(params.categoria)?.trim() || null;
  const openNow = firstValue(params.abierto) === "1";
  const requestedPage = Number.parseInt(firstValue(params.pagina) ?? "1", 10);

  if (!blockId) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8">
          <h1 className="font-display text-3xl font-extrabold text-carbon">
            Buscar
          </h1>
          <EmptyState
            title="No hay bloques del campus"
            description="Todavía no se cargaron los bloques del campus. Vuelve más tarde."
          />
        </main>
      </div>
    );
  }

  const [categories, raw] = await Promise.all([
    getCategories(),
    searchProducts({
      budget,
      blockId,
      radiusM: RADIUS_M,
      category,
    }),
  ]);

  const filtered = searchCatalog(raw, {
    budget,
    category,
    maxDistanceM: RADIUS_M,
    openNow,
  });
  const pageData = paginate(filtered, requestedPage, PAGE_SIZE);

  await logSearchEvent({ budget, blockId, category });

  const hrefFor = (page: number) => {
    const search = new URLSearchParams();
    if (budget !== null) search.set("presupuesto", String(budget));
    search.set("bloque", blockId);
    if (category) search.set("categoria", category);
    if (openNow) search.set("abierto", "1");
    if (page > 1) search.set("pagina", String(page));
    return `/buscar?${search.toString()}`;
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <SnapshotRefresher />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        <Link
          href="/"
          className="text-sm font-semibold text-carbon underline underline-offset-4"
        >
          Volver al inicio
        </Link>

        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-carbon sm:text-4xl">
          Buscar
        </h1>
        <p className="mt-2 text-base text-carbon/70">
          {pageData.total} {pageData.total === 1 ? "resultado" : "resultados"}{" "}
          con estos filtros.
        </p>

        <div className="mt-6 bg-campus p-5">
          <SearchForm
            blocks={blocks}
            categories={categories}
            defaults={{
              budget: firstValue(params.presupuesto),
              blockId,
              category: category ?? "",
              openNow,
            }}
          />
        </div>

        {pageData.total === 0 ? (
          <EmptyState
            title="No encontramos productos"
            description="Prueba con más presupuesto, otro bloque, otra categoría o quita el filtro de abierto."
            actionHref={`/buscar?bloque=${blockId}`}
            actionLabel="Limpiar filtros"
          />
        ) : (
          <>
            <ul className="mt-8">
              {pageData.items.map((item) => (
                <ProductRow key={item.id} item={item} />
              ))}
            </ul>
            <Pagination
              page={pageData.page}
              totalPages={pageData.totalPages}
              hrefFor={hrefFor}
            />
          </>
        )}
      </main>
    </div>
  );
}
