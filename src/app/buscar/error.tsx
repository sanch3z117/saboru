"use client";

import { Button } from "@/components/ui/button";

export default function SearchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
      <p className="font-display text-sm font-semibold text-carbon">SaborU</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-carbon">
        No pudimos cargar la búsqueda
      </h1>
      <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-carbon/80">
        Revisa tu conexión e inténtalo de nuevo.
      </p>
      <Button type="button" className="mt-6 w-fit" onClick={() => reset()}>
        Reintentar
      </Button>
    </main>
  );
}
