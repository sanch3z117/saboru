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
        <span className="sr-only">Cargando SaborU…</span>
        <div className="h-3 w-24 animate-pulse rounded-pill bg-antojo/50" />
        <div className="mt-4 h-10 w-2/3 animate-pulse rounded bg-carbon/10" />
        <div className="mt-3 h-4 w-full max-w-[46ch] animate-pulse rounded bg-carbon/10" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-card border-2 border-carbon/20 bg-cream"
            >
              <div className="aspect-[16/10] animate-pulse bg-campus/30" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-carbon/10" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-carbon/10" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-carbon/10" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
