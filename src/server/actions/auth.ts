"use server";

import { headers } from "next/headers";
import type { z } from "zod";

import { demoEmailModeEnabled } from "@/lib/auth/demo";
import { PRIVACY_VERSION } from "@/lib/auth/privacy";
import {
  ALLOWED_STUDENT_DOMAIN,
  emailSchema,
  studentRegistrationEmailSchema,
} from "@/lib/auth/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error: string | null;
  sent: boolean;
};

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Revisa el correo";
}

async function getOrigin() {
  const headerStore = await headers();
  return (
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://127.0.0.1:3000"
  );
}

export async function requestStudentMagicLink(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (formData.get("consent") !== "on") {
    return {
      error: "Debes aceptar la política de privacidad para crear tu cuenta.",
      sent: false,
    };
  }

  const demoMode = demoEmailModeEnabled();
  const parsed = studentRegistrationEmailSchema(demoMode).safeParse(
    formData.get("email"),
  );
  if (!parsed.success) {
    return { error: firstIssue(parsed.error), sent: false };
  }

  const isExternal = !parsed.data.endsWith(`@${ALLOWED_STUDENT_DOMAIN}`);
  let demoAdmin: ReturnType<typeof createAdminClient> | null = null;

  // En demo, el servidor agrega el correo a una allowlist de un solo uso. Solo
  // el service role puede escribirla; el trigger crea el perfil student y la
  // consume. Reseñas y favoritos siguen exigiendo @uptc.edu.co.
  if (demoMode && isExternal) {
    demoAdmin = createAdminClient();
    const { error: allowError } = await demoAdmin
      .from("demo_email_allowlist")
      .upsert({ email: parsed.data }, { onConflict: "email" });

    if (allowError) {
      return {
        error:
          "No pudimos preparar la cuenta demo. Intenta de nuevo en un momento.",
        sent: false,
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
      data: {
        privacy_accepted_at: new Date().toISOString(),
        privacy_version: PRIVACY_VERSION,
      },
    },
  });

  if (error) {
    return {
      error: "No pudimos enviar el enlace. Intenta de nuevo en un momento.",
      sent: false,
    };
  }

  if (demoAdmin) {
    await demoAdmin
      .from("demo_email_allowlist")
      .delete()
      .eq("email", parsed.data);
  }

  return { error: null, sent: true };
}

export async function requestVendorMagicLink(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (formData.get("consent") !== "on") {
    return {
      error:
        "Debes aceptar la política de privacidad para aceptar la invitación.",
      sent: false,
    };
  }

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: firstIssue(parsed.error), sent: false };
  }

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("vendor_invites")
    .select("id")
    .eq("email", parsed.data)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (inviteError) {
    return {
      error: "No pudimos verificar la invitación. Intenta de nuevo.",
      sent: false,
    };
  }

  if (!invite) {
    return {
      error:
        "Este correo no tiene una invitación de vendedor abierta. Pídele una a un administrador.",
      sent: false,
    };
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", parsed.data)
    .maybeSingle();

  if (existingProfile) {
    return {
      error: "Ya existe una cuenta con este correo. Inicia sesión.",
      sent: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
      data: {
        privacy_accepted_at: new Date().toISOString(),
        privacy_version: PRIVACY_VERSION,
      },
    },
  });

  if (error) {
    return {
      error: "No pudimos enviar el enlace. Intenta de nuevo en un momento.",
      sent: false,
    };
  }

  return { error: null, sent: true };
}

export async function requestLoginMagicLink(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: firstIssue(parsed.error), sent: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return {
      error:
        "No pudimos enviar el enlace. Verifica que tu correo tenga cuenta o regístrate.",
      sent: false,
    };
  }

  return { error: null, sent: true };
}
