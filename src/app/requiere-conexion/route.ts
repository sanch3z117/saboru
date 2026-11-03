import { REQUIRES_CONNECTION_HTML } from "@/lib/offline/requires-connection-html";

export const dynamic = "force-static";

export function GET() {
  return new Response(REQUIRES_CONNECTION_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "x-saboru-fallback": "gate",
    },
  });
}
