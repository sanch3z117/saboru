import Link from "next/link";

import { SaboruLogo } from "@/components/brand/saboru-logo";

const LINKS = [
  { href: "/buscar", label: "Buscar locales" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/offline", label: "Catálogo sin conexión" },
  { href: "/login", label: "Entrar" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-carbon bg-campus">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_1fr] lg:px-10">
        <div>
          <Link
            href="/"
            aria-label="SaborU, ir al inicio"
            className="inline-block w-fit"
          >
            <SaboruLogo className="h-11 w-auto rounded-panel border-2 border-carbon bg-cream p-1.5" />
          </Link>
          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-carbon">
            Antojo con criterio. Para la comunidad universitaria de la UPTC,
            Tunja.
          </p>
        </div>

        <nav aria-label="Enlaces del pie">
          <ul className="grid gap-2 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-10 items-center font-semibold text-carbon underline-offset-4 hover:underline focus-visible:rounded-sm"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-carbon/30 pt-3 text-xs text-carbon/75">
            Catálogo con datos ficticios en la demo.
          </p>
        </nav>
      </div>
    </footer>
  );
}
