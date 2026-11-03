import "server-only";

import { getClientIp } from "@/lib/http/ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type LogSearchArgs = Database["public"]["Functions"]["log_search"]["Args"];

export async function logSearchEvent(params: {
  budget: number | null;
  blockId: string | null;
  category: string | null;
}) {
  const ip = await getClientIp();
  const { success } = await checkRateLimit("search", ip);
  if (!success) return;

  const supabase = await createClient();
  // Los tipos generados no reflejan null en argumentos, pero PostgREST lo acepta.
  await supabase.rpc("log_search", {
    p_budget: params.budget,
    p_block_id: params.blockId,
    p_category: params.category,
  } as unknown as LogSearchArgs);
}

export async function logProductView(productId: string) {
  const ip = await getClientIp();
  const { success } = await checkRateLimit("view", ip);
  if (!success) return;

  const supabase = await createClient();
  await supabase.rpc("log_product_view", { p_product_id: productId });
}
