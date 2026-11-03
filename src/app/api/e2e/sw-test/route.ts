import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Service worker mínimo para el E2E de actualización. Solo existe cuando
 * `E2E_SW_TEST=1` (Playwright); en producción responde 404.
 */
export async function GET() {
  if (process.env.E2E_SW_TEST !== "1") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const script = `
self.addEventListener("install", () => {});
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Service-Worker-Allowed": "/",
    },
  });
}
