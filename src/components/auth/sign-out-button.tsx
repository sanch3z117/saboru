"use client";

import { useTransition } from "react";

import { useSignOut } from "@/components/auth/use-sign-out";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const signOut = useSignOut();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      className="mt-8"
      onClick={() => {
        startTransition(async () => {
          await signOut();
        });
      }}
    >
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </Button>
  );
}
