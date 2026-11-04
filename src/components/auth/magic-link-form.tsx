"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthFormState } from "@/server/actions/auth";

type MagicLinkFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  hint?: string;
  requireConsent?: boolean;
};

const initialState: AuthFormState = { error: null, sent: false };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-fit">
      {pending ? "Enviando…" : label}
    </Button>
  );
}

export function MagicLinkForm({
  action,
  submitLabel,
  hint,
  requireConsent = false,
}: MagicLinkFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  if (state.sent) {
    return (
      <Alert tone="success" className="mt-6">
        Revisa tu correo y abre el enlace para entrar. Si no llega en unos
        minutos, revisa la carpeta de spam.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={hint ? "email-hint" : undefined}
          placeholder="tu.correo@uptc.edu.co"
        />
        {hint ? (
          <p id="email-hint" className="text-sm text-carbon/70">
            {hint}
          </p>
        ) : null}
      </div>

      {requireConsent ? (
        <div className="flex items-start gap-3">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            className="mt-1 size-4 shrink-0 accent-carbon"
          />
          <label
            htmlFor="consent"
            className="text-sm leading-relaxed text-carbon/80"
          >
            Acepto la{" "}
            <Link
              href="/privacidad"
              className="font-semibold text-carbon underline underline-offset-4"
            >
              política de privacidad
            </Link>{" "}
            y autorizo el tratamiento de mis datos personales para crear mi
            cuenta (Ley 1581 de 2012).
          </label>
        </div>
      ) : null}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
