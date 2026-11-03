import "server-only";

import { headers } from "next/headers";

export async function getClientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");

  return (
    forwarded?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? "local"
  );
}
