import Link from "next/link";

import { SessionMenu } from "@/components/auth/session-menu";
import { SaboruLogo } from "@/components/brand/saboru-logo";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 pt-6 sm:px-8 sm:pt-8">
      <Link href="/" aria-label="SaborU, ir al inicio" className="w-fit">
        <SaboruLogo className="h-11 w-auto sm:h-12" />
      </Link>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="hidden text-sm font-medium text-carbon/70 sm:inline">
          UPTC · Tunja
        </span>
        <Link
          href="/privacidad"
          className="text-sm font-medium text-carbon/70 underline-offset-4 hover:underline"
        >
          Privacidad
        </Link>
        <SessionMenu />
      </div>
    </header>
  );
}
