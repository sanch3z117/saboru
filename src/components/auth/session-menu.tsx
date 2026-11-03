"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useSignOut } from "@/components/auth/use-sign-out";
import { createClient } from "@/lib/supabase/browser";

export function SessionMenu() {
  const signOut = useSignOut();
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
      onClick={() => {
        void signOut();
      }}
    >
      Salir
    </button>
  );
}
