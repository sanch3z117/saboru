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
        className="inline-flex h-9 items-center rounded-pill border-0 bg-transparent px-1 text-xs font-semibold text-carbon underline underline-offset-4 hover:text-antojo sm:border-2 sm:border-carbon sm:bg-campus sm:px-3 sm:text-sm sm:no-underline sm:hover:brightness-95"
      >
        Entrar
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center rounded-pill border-0 bg-transparent px-1 text-xs font-semibold text-carbon underline underline-offset-4 hover:text-antojo sm:border-2 sm:border-carbon sm:bg-cream sm:px-3 sm:text-sm sm:no-underline sm:hover:bg-campus/50"
      onClick={() => {
        void signOut();
      }}
    >
      Salir
    </button>
  );
}
