"use client";

import { Button } from "@/components/ui/button";

export default function VendorPanelError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <p className="text-sm font-semibold text-carbon/60">Panel del vendedor</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-carbon">
        No pudimos cargar tu panel
      </h1>
      <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-carbon/80">
        Puede ser un problema de conexión. Vuelve a intentarlo; si sigue
        pasando, escríbenos.
      </p>
      <Button type="button" onClick={reset} className="mt-6 w-fit">
        Reintentar
      </Button>
    </main>
  );
}
