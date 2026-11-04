import Link from "next/link";

import { SaboruLogo } from "@/components/brand/saboru-logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-center lg:gap-16 lg:py-12">
        <aside className="hidden min-h-[32rem] flex-col justify-between rounded-card border-2 border-carbon bg-campus p-8 shadow-hard lg:flex">
          <Link
            href="/"
            aria-label="SaborU, ir al inicio"
            className="w-fit"
          >
            <SaboruLogo className="h-14 w-auto" />
          </Link>
          <div>
            <p className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-carbon">
              Antojo con criterio.
            </p>
            <p className="mt-4 max-w-[36ch] text-base leading-relaxed text-carbon/80">
              Descubre, compara y califica dónde comer en el campus. Tu correo
              institucional confirma que eres parte de la comunidad UPTC.
            </p>
          </div>
          <p className="text-sm font-semibold text-carbon/70">UPTC · Tunja</p>
        </aside>

        <main id="contenido" className="mx-auto w-full max-w-lg lg:mx-0">
          <Link
            href="/"
            aria-label="SaborU, ir al inicio"
            className="mb-8 inline-block w-fit lg:hidden"
          >
            <SaboruLogo className="h-11 w-auto" />
          </Link>

          {children}

          <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-carbon/15 pt-4 text-sm text-carbon/70">
            <Link
              href="/"
              className="font-semibold text-carbon underline underline-offset-4"
            >
              Volver al inicio
            </Link>
            <Link
              href="/privacidad"
              className="font-semibold text-carbon underline underline-offset-4"
            >
              Privacidad
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
