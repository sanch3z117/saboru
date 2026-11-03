import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { SessionCleanup } from "@/components/offline/session-cleanup";
import { homeForRole, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { requestLoginMagicLink } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    redirect(homeForRole((profile?.role as AppRole | undefined) ?? "student"));
  }

  return (
    <div>
      <SessionCleanup />
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-carbon">
        Entrar
      </h1>
      <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-carbon/80">
        Te enviamos un enlace a tu correo. No necesitas contraseña.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-6 border border-carbon px-4 py-3 text-sm font-semibold text-carbon"
        >
          El enlace no es válido o expiró. Pide uno nuevo.
        </p>
      ) : null}

      <MagicLinkForm
        action={requestLoginMagicLink}
        submitLabel="Enviar enlace"
      />

      <p className="mt-8 text-sm text-carbon/80">
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-semibold text-carbon underline underline-offset-4"
        >
          Soy estudiante UPTC
        </Link>{" "}
        o{" "}
        <Link
          href="/registro/vendedor"
          className="font-semibold text-carbon underline underline-offset-4"
        >
          soy vendedor invitado
        </Link>
        .
      </p>
    </div>
  );
}
