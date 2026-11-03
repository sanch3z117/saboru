import type { Metadata } from "next";
import Link from "next/link";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { requestVendorMagicLink } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Registro de vendedor",
};

export default function VendorRegisterPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-carbon">
        Registro de vendedor
      </h1>
      <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-carbon/80">
        Los vendedores entran solo con invitación de un administrador. Usa el
        correo exacto al que te la enviaron.
      </p>

      <MagicLinkForm
        action={requestVendorMagicLink}
        submitLabel="Aceptar invitación"
        hint="El correo debe tener una invitación abierta."
        requireConsent
      />

      <p className="mt-8 text-sm text-carbon/80">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-carbon underline underline-offset-4"
        >
          Entra
        </Link>
        .
      </p>
    </div>
  );
}
