export default function VendorPanelLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-sm font-semibold text-carbon/60">Cargando panel…</p>
      <div className="mt-4 h-10 w-2/3 animate-pulse bg-carbon/10" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-4">
          <div className="h-4 w-32 animate-pulse bg-carbon/10" />
          <div className="h-32 animate-pulse bg-carbon/10" />
          <div className="h-24 animate-pulse bg-carbon/10" />
        </div>
        <div className="h-48 animate-pulse bg-carbon/10" />
      </div>
    </div>
  );
}
