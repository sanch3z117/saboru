"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/browser";

export function SessionMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>();

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
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
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
