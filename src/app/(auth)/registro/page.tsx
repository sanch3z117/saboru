import type { Metadata } from "next";
import Link from "next/link";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { requestStudentMagicLink } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Registro de estudiante",
};

export default function StudentRegisterPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-carbon">
        Registro de estudiante
      </h1>
      <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-carbon/80">
        Solo correos institucionales de la UPTC. Te enviamos un enlace para
        confirmar tu correo.
      </p>

      <MagicLinkForm
        action={requestStudentMagicLink}
        submitLabel="Crear cuenta"
        hint="Debe terminar en @uptc.edu.co."
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
