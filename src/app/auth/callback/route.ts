import { NextResponse, type NextRequest } from "next/server";

import { homeForRole, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(authError)}`, siteUrl),
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let role: AppRole = "student";

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        role = (profile?.role as AppRole | undefined) ?? "student";
      }

      const destination =
        next && next.startsWith("/") ? next : homeForRole(role);

      return NextResponse.redirect(new URL(destination, siteUrl));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=enlace_invalido", siteUrl),
  );
}
