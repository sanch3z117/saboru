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
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://api.maptiler.com https://*.maptiler.com https://*.supabase.co",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://api.maptiler.com https://*.maptiler.com",
  "worker-src 'self' blob:",
].join("; ");

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
