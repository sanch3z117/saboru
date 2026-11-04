import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        id="contenido"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16 sm:px-8"
      >
        <p className="inline-flex w-fit items-center rounded-pill border-2 border-carbon bg-campus px-3 py-1 text-sm font-bold text-carbon">
          404
        </p>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-carbon">
          No encontramos esa página
        </h1>
        <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-carbon/80">
          Puede que el local o el producto ya no estén publicados, o que el
          enlace haya cambiado.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/buscar"
            className="inline-flex h-11 items-center justify-center rounded-pill border-2 border-carbon bg-antojo px-4 text-sm font-semibold text-carbon shadow-hard-sm hover:brightness-95"
          >
            Buscar locales
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-pill border-2 border-carbon bg-cream px-4 text-sm font-semibold text-carbon hover:bg-campus/40"
          >
            Ir al inicio
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
