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
    <footer className="mt-16 border-t-2 border-carbon bg-cream">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Link
            href="/"
            aria-label="SaborU, ir al inicio"
            className="inline-block w-fit"
          >
            <SaboruLogo className="h-10 w-auto" />
          </Link>
          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-carbon/70">
            Antojo con criterio. Para la comunidad universitaria de la UPTC,
            Tunja.
          </p>
        </div>

        <nav aria-label="Enlaces del pie">
          <ul className="grid gap-2 text-sm md:grid-cols-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-semibold text-carbon underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-carbon/55">
            Catálogo con datos ficticios en la demo.
          </p>
        </nav>
      </div>
    </footer>
  );
}
