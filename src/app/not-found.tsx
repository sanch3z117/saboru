import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <p className="font-display text-sm font-semibold text-carbon">SaborU</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-carbon">
          No encontramos esa página
        </h1>
        <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-carbon/80">
          Puede que el local o el producto ya no estén publicados.
        </p>
        <Link
          href="/buscar"
          className="mt-6 w-fit text-sm font-semibold text-carbon underline underline-offset-4"
        >
          Volver a buscar
        </Link>
      </main>
    </div>
  );
}
