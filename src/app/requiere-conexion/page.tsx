import type { Metadata } from "next";

import { RequiresConnection } from "@/components/offline/requires-connection";

export const metadata: Metadata = {
  title: "Requiere conexión",
  description:
    "El panel y las pantallas de cuenta de SaborU necesitan conexión a internet.",
};

export default function RequiresConnectionPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
      <p className="font-display text-sm font-semibold text-carbon">SaborU</p>
      <div className="mt-3">
        <RequiresConnection />
      </div>
    </main>
  );
}
