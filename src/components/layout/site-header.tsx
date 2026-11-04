import Link from "next/link";
import { Search } from "lucide-react";

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
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-8">
        <Link
          href="/"
          aria-label="SaborU, ir al inicio"
          className="w-fit shrink-0"
        >
          <SaboruLogo className="h-10 w-auto sm:h-11" />
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

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/buscar"
            className="inline-flex h-9 items-center gap-1 rounded-pill border-2 border-carbon bg-cream px-2.5 text-xs font-semibold text-carbon underline-offset-4 hover:bg-campus/50 md:hidden"
          >
            <Search aria-hidden="true" className="size-3.5" />
            Buscar
          </Link>
          <SessionMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
