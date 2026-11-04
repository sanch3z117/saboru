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
        className="inline-flex h-9 items-center rounded-pill border-2 border-carbon bg-campus px-3 text-sm font-semibold text-carbon underline-offset-4 hover:brightness-95"
      >
        Entrar
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center rounded-pill border-2 border-carbon bg-cream px-3 text-sm font-semibold text-carbon underline-offset-4 hover:bg-campus/50"
      onClick={() => {
        void signOut();
      }}
    >
      Salir
    </button>
  );
}
