import { NextResponse } from "next/server";

import { getCatalogSnapshot } from "@/server/queries/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getCatalogSnapshot();

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
