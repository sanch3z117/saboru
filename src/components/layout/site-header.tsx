import Link from "next/link";

import { SessionMenu } from "@/components/auth/session-menu";
import { SaboruLogo } from "@/components/brand/saboru-logo";

import { MobileNav } from "./mobile-nav";

const LINKS = [
  { href: "/buscar", label: "Buscar" },
  { href: "/privacidad", label: "Privacidad" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-carbon bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/90">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-2.5 sm:px-8">
        <Link
          href="/"
          aria-label="SaborU, ir al inicio"
          className="w-fit shrink-0"
        >
          <SaboruLogo className="h-9 w-auto sm:h-10" />
        </Link>

        <nav
          aria-label="Navegación principal"
          className="ml-2 hidden items-center gap-1 md:flex"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-9 items-center rounded-pill px-3 text-sm font-semibold text-carbon underline-offset-4 hover:bg-campus/40 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SessionMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
