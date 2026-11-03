"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  cleanupLocalUserData,
  confirmPendingOutbox,
} from "@/lib/offline/cleanup";
import { signOutAction } from "@/server/actions/auth";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      className="mt-8"
      onClick={() => {
        startTransition(async () => {
          if (!(await confirmPendingOutbox())) {
            return;
          }
          await cleanupLocalUserData().catch(() => undefined);
          await signOutAction();
        });
      }}
    >
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </Button>
  );
}
