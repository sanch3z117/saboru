import { SiteHeader } from "@/components/layout/site-header";

export default function AdminLoading() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="rounded-card border-2 border-carbon bg-campus p-5 shadow-hard sm:p-8">
          <p className="inline-flex rounded-pill border-2 border-carbon bg-cream px-3 py-1 text-sm font-semibold text-carbon">
            Administración
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-carbon">
            Cargando moderación…
          </h1>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
          <div className="h-16 animate-pulse rounded-card border-2 border-carbon bg-cream shadow-hard-sm lg:h-64" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-panel border-2 border-carbon bg-cream"
              />
            ))}
          </div>
        </div>
        <p className="mt-8 text-sm text-carbon/60">
          Estamos reuniendo reportes, reseñas y locales.
        </p>
      </main>
    </div>
  );
}
