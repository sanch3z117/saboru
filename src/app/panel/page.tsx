import type { Metadata } from "next";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireRole } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Panel del vendedor",
};

export default async function VendorPanelPage() {
  const { profile } = await requireRole("vendor");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-5 py-16 sm:px-8">
      <p className="font-display text-sm font-semibold text-carbon">SaborU</p>
      <h1 className="mt-3 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-carbon">
        Panel del vendedor
      </h1>
      <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-carbon/80">
        Hola, {profile.full_name || profile.email}. Aquí irá la gestión de tu
        local y sus estadísticas.
      </p>
      <SignOutButton />
    </main>
  );
}
