import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

function getRevision() {
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return randomUUID();
  }
}

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [
    { url: "/offline", revision: getRevision() },
    { url: "/requiere-conexion", revision: getRevision() },
  ],
  disable: process.env.NODE_ENV === "development",
});

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://api.maptiler.com https://*.maptiler.com https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://api.maptiler.com https://*.maptiler.com http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:54321 ws://localhost:54321",
  "worker-src 'self' blob:",
].join("; ");

const isProduction = process.env.NODE_ENV === "production";

function supabaseImagePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const patterns: NonNullable<
    NonNullable<NextConfig["images"]>["remotePatterns"]
  > = [
    {
      protocol: "https",
      hostname: "**.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
  ];

  if (configured) {
    try {
      const url = new URL(configured);
      const protocol = url.protocol === "http:" ? "http" : "https";
      patterns.unshift({
        protocol,
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/storage/v1/object/public/**",
      });
    } catch {
      // Una URL inválida no debe romper el build; queda el patrón de Supabase.
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseImagePatterns(),
  },
  async headers() {
    const securityHeaders: { key: string; value: string }[] = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
      },
      {
        key: "Content-Security-Policy-Report-Only",
        value: contentSecurityPolicy,
      },
    ];

    if (isProduction) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withSerwist(nextConfig);
