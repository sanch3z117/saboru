import { NextResponse } from "next/server";
import sharp from "sharp";

import { photoSrc } from "@/lib/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedPhotoPath(path: string) {
  if (!path || path.includes("..") || path.includes("://")) return false;
  if (path.startsWith("/")) return path.startsWith("/demo/");
  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "";

  if (!isAllowedPhotoPath(path)) {
    return new NextResponse("Foto inválida", { status: 400 });
  }

  const src = photoSrc(path);
  if (!src) {
    return new NextResponse("Foto no disponible", { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const url = /^https?:\/\//i.test(src)
    ? src
    : new URL(src, origin).toString();

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return new NextResponse("Foto no disponible", { status: 404 });
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const png = await sharp(buffer).png().toBuffer();

    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("Foto no disponible", { status: 404 });
  }
}
