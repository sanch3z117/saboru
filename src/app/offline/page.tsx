import type { Metadata } from "next";

import { OfflineCatalog } from "@/components/offline/offline-catalog";

export const metadata: Metadata = {
  title: "Sin conexión",
  description: "Catálogo público de SaborU disponible sin conexión.",
};

export default function OfflinePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 pt-6 sm:px-8 sm:pt-8">
        <p className="font-display text-lg font-extrabold tracking-tight text-carbon">
          SaborU
        </p>
        <p className="text-sm font-medium text-carbon/60">Sin conexión</p>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <OfflineCatalog />
      </main>
    </div>
  );
}
