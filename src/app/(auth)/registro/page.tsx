import type { Metadata } from "next";
import Link from "next/link";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Alert } from "@/components/ui/alert";
import { DEMO_EMAIL_NOTICE, demoEmailModeEnabled } from "@/lib/auth/demo";
import { requestStudentMagicLink } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Registro de estudiante",
};

// La bandera se lee en cada petición para que el aviso siga el entorno real.
export const dynamic = "force-dynamic";

export default function StudentRegisterPage() {
  const demoMode = demoEmailModeEnabled();

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-carbon">
        Registro de estudiante
      </h1>
      <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-carbon/80">
        {demoMode
          ? "En este entorno de demostración puedes registrarte con cualquier correo. Te enviamos un enlace para confirmar tu cuenta."
          : "Solo correos institucionales de la UPTC. Te enviamos un enlace para confirmar tu correo."}
      </p>

      {demoMode ? (
        <Alert tone="info" className="mt-4" data-testid="demo-email-notice">
          {DEMO_EMAIL_NOTICE}
        </Alert>
      ) : null}

      <MagicLinkForm
        action={requestStudentMagicLink}
        submitLabel="Crear cuenta"
        hint={
          demoMode
            ? "Cualquier correo válido sirve en este demo."
            : "Debe terminar en @uptc.edu.co."
        }
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
