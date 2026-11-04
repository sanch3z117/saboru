"use client";

import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        id="contenido"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16 sm:px-8"
      >
        <p className="inline-flex w-fit items-center rounded-pill border-2 border-carbon bg-antojo px-3 py-1 text-sm font-bold text-carbon">
          Administración
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-carbon sm:text-4xl">
          No pudimos cargar la administración
        </h1>
        <p className="mt-3 max-w-[55ch] text-base leading-relaxed text-carbon/80">
          Revisa la conexión e inténtalo de nuevo. Si el problema sigue, avisa
          al equipo de SaborU.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            Reintentar
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
