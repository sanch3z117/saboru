"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/browser";
import {
  cleanupLocalUserData,
  confirmPendingOutbox,
} from "@/lib/offline/cleanup";

export function SessionMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>();

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
  }, []);

  if (email === undefined) {
    return null;
  }

  if (!email) {
    return (
      <Link
        href="/login"
        className="text-sm font-semibold text-carbon underline underline-offset-4"
      >
        Entrar
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="text-sm font-semibold text-carbon underline underline-offset-4"
      onClick={async () => {
        if (!(await confirmPendingOutbox())) {
          return;
        }
        const supabase = createClient();
        await supabase.auth.signOut();
        await cleanupLocalUserData().catch(() => undefined);
        router.push("/login");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
