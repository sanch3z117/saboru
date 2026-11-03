import { SiteHeader } from "@/components/layout/site-header";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        aria-busy="true"
        aria-live="polite"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8"
      >
        <p className="text-sm font-medium text-carbon/60">Cargando ficha…</p>
        <div className="mt-6 h-12 w-2/3 animate-pulse bg-carbon/10" />
        <div className="mt-8 aspect-[16/6] w-full animate-pulse bg-campus/40" />
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-12 animate-pulse bg-carbon/10" />
          ))}
        </div>
      </main>
    </div>
  );
}
