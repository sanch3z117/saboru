import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

import { SaboruLogo } from "@/components/brand/saboru-logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { OfflineCatalog } from "@/components/offline/offline-catalog";

export const metadata: Metadata = {
  title: "Sin conexión",
  description: "Catálogo público de SaborU disponible sin conexión.",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-carbon bg-cream">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link
            href="/"
            aria-label="SaborU, ir al inicio"
            className="w-fit shrink-0"
          >
            <SaboruLogo className="h-9 w-auto sm:h-10" />
          </Link>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-carbon/70">
            <WifiOff aria-hidden="true" className="size-4" />
            Sin conexión
          </p>
        </div>
      </header>

      <main
        id="contenido"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8"
      >
        <OfflineCatalog />
      </main>

      <SiteFooter />
    </div>
  );
}
