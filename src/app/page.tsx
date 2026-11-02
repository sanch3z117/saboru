import { SaboruLogo } from "@/components/brand/saboru-logo";

const criteria = [
  {
    label: "Presupuesto",
    detail: "Filtra por lo que llevas en el bolsillo, en pesos.",
  },
  {
    label: "Cercanía",
    detail: "Ordena por bloque y minutos a pie.",
  },
  {
    label: "Calidad",
    detail: "Promedios por criterio y reseñas de estudiantes.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 pt-6 sm:px-8 sm:pt-8">
        <SaboruLogo className="h-11 w-auto sm:h-12" />
        <span className="text-sm font-medium text-carbon/70">UPTC · Tunja</span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16">
          <div>
            <h1 className="max-w-[16ch] font-display text-[clamp(2.25rem,7vw,4.25rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance text-carbon">
              Qué comer, cuánto cuesta y qué tan lejos queda.
            </h1>

            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-carbon/80 sm:text-lg">
              Descubre, compara y califica dónde comer en tu campus. Precio,
              distancia y reseñas de otros estudiantes, antes de salir del
              bloque.
            </p>
          </div>

          <section
            aria-labelledby="criterios"
            className="bg-campus px-5 py-6 text-carbon sm:px-6"
          >
            <h2 id="criterios" className="sr-only">
              Criterios de búsqueda
            </h2>
            <ul>
              {criteria.map((item) => (
                <li
                  key={item.label}
                  className="border-b border-carbon/20 py-4 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <span className="font-display text-lg font-semibold">
                    {item.label}
                  </span>
                  <p className="mt-1 text-sm leading-snug text-carbon/80">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 pb-6 sm:px-8 sm:pb-8">
        <p className="text-sm text-carbon/70">
          Antojo con criterio. Para la comunidad universitaria de la UPTC,
          Tunja.
        </p>
      </footer>
    </div>
  );
}
