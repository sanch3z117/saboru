import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { homeForRole, type AppRole } from "./roles";

export type SessionProfile = {
  id: string;
  role: AppRole;
  full_name: string;
  email: string;
};

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return {
    supabase,
    user,
    profile: {
      ...profile,
      role: profile.role as AppRole,
    } satisfies SessionProfile,
  };
}

export async function requireRole(role: AppRole) {
  const session = await requireUser();

  if (session.profile.role !== role) {
    redirect(homeForRole(session.profile.role));
  }

  return session;
}
