import { CampusMapLoader } from "./campus-map-loader";

/**
 * Sección temporal de 7.5.1 para probar el mapa en la home. 7.5.2 la
 * reemplaza por la superficie de descubrimiento map-first; no debe quedar
 * duplicada.
 */
export function CampusMapSection() {
  return (
    <section aria-labelledby="mapa-titulo" className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="mapa-titulo"
          className="font-display text-2xl font-semibold text-carbon"
        >
          Mapa del campus
        </h2>
        <p className="text-sm text-carbon/60">
          Solo con conexión. Sin mapa, los locales siguen en la lista.
        </p>
      </div>
      <CampusMapLoader />
    </section>
  );
}
