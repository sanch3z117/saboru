const STEPS = [
  {
    title: "Busca por antojo",
    body: "Escribe un plato, elige una categoría o pon tu presupuesto. El mapa y la lista se mueven juntos.",
  },
  {
    title: "Mira dónde y cuánto",
    body: "Compara distancia, precio, horario y lo que opinan otros estudiantes del campus.",
  },
  {
    title: "Califica con criterio",
    body: "Entra con tu correo UPTC y deja una reseña verificada para que la próxima persona decida mejor.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      aria-labelledby="como-funciona"
      className="mt-14 border-y-2 border-carbon py-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="como-funciona"
          className="font-display text-2xl font-semibold text-carbon"
        >
          Cómo funciona
        </h2>
        <p className="text-sm text-carbon/60">
          Tres pasos para elegir sin dar vueltas.
        </p>
      </div>
      <ol className="mt-6 grid gap-5 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="font-display text-2xl leading-none font-extrabold text-antojo">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold text-carbon">
                {step.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-carbon/70">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
