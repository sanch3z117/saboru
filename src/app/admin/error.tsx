"use client";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-sm font-semibold text-carbon/60">Administración</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-carbon">
          No pudimos cargar la administración
        </h1>
        <p className="mt-3 max-w-[55ch] text-base leading-relaxed text-carbon/80">
          Revisa la conexión e inténtalo de nuevo. Si el problema sigue, avisa
          al equipo de SaborU.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          Reintentar
        </Button>
      </main>
    </div>
  );
}
