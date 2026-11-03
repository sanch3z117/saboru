import { SiteHeader } from "@/components/layout/site-header";

export default function AdminLoading() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <p className="text-sm font-semibold text-carbon/60">Administración</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-carbon">
          Cargando moderación…
        </h1>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse border border-carbon/15 bg-carbon/5"
            />
          ))}
        </div>
        <p className="mt-8 text-sm text-carbon/60">
          Estamos reuniendo reportes, reseñas y locales.
        </p>
      </main>
    </div>
  );
}
