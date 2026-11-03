import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { syncBodySchema } from "@/lib/validations/sync";
import { processSyncOperations } from "@/server/services/sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = syncBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await processSyncOperations({
    client: supabase,
    userId: user.id,
    operations: parsed.data.operations,
  });

  if (result.limited) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  return NextResponse.json({ results: result.results });
}
