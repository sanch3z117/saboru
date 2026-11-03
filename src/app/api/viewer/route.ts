import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ viewer: null }, { headers: NO_STORE });
  }

  const [institutional, profile] = await Promise.all([
    supabase.rpc("is_institutional_student"),
    supabase.from("profiles").select("role, email").eq("id", user.id).single(),
  ]);

  return NextResponse.json(
    {
      viewer: {
        userId: user.id,
        email: profile.data?.email ?? user.email ?? "",
        role: profile.data?.role ?? "student",
        canReview: Boolean(institutional.data),
      },
    },
    { headers: NO_STORE },
  );
}
