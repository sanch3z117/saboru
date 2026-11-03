import Link from "next/link";

import { RetryButton } from "@/components/offline/retry-button";

export function RequiresConnection() {
  return (
    <div className="max-w-[46ch]">
      <h1 className="font-display text-3xl leading-[1.05] font-extrabold tracking-tight text-carbon sm:text-4xl">
        Requiere conexión
      </h1>
      <p className="mt-4 text-base leading-relaxed text-carbon/80">
        El panel y las pantallas de cuenta necesitan internet. No mostramos
        datos guardados de tu sesión aquí. Vuelve a conectarte para continuar.
      </p>
      <RetryButton />
      <Link
        href="/offline"
        className="mt-4 block w-fit text-sm font-semibold text-carbon underline underline-offset-4"
      >
        Ver catálogo sin conexión
      </Link>
    </div>
  );
}
