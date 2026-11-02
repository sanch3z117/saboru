import type { Metadata } from "next";

import { RetryButton } from "@/components/offline/retry-button";

export const metadata: Metadata = {
  title: "Sin conexión",
  description: "No hay conexión disponible para cargar esta página.",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
      <p className="font-display text-sm font-semibold text-carbon">SaborU</p>
      <h1 className="mt-3 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-carbon sm:text-5xl">
        No hay conexión
      </h1>
      <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-carbon/80">
        Esta página necesita internet la primera vez que la abres. Revisa tu
        conexión y vuelve a intentarlo.
      </p>
      <RetryButton />
    </main>
  );
}
