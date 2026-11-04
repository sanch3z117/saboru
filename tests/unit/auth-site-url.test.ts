import { describe, expect, it } from "vitest";

import { resolveAuthSiteUrl } from "@/lib/auth/site-url";

describe("resolveAuthSiteUrl", () => {
  it("en preview usa el host del deployment", () => {
    expect(
      resolveAuthSiteUrl({
        origin: "https://saboru-demo.vercel.app",
        vercelEnv: "preview",
        vercelUrl: "saboru-demo.vercel.app",
        siteUrl: "https://saboru.vercel.app",
      }),
    ).toBe("https://saboru-demo.vercel.app");
  });

  it("en producción mantiene el sitio canónico", () => {
    expect(
      resolveAuthSiteUrl({
        origin: "https://saboru.vercel.app",
        vercelEnv: "production",
        vercelUrl: "saboru-abc.vercel.app",
        siteUrl: "https://saboru.vercel.app",
      }),
    ).toBe("https://saboru.vercel.app");
  });

  it("sin sitio configurado usa el origen de la petición", () => {
    expect(
      resolveAuthSiteUrl({
        origin: "http://127.0.0.1:3000",
        vercelEnv: undefined,
        vercelUrl: undefined,
        siteUrl: undefined,
      }),
    ).toBe("http://127.0.0.1:3000");
  });

  it("en preview sin VERCEL_URL usa el sitio canónico", () => {
    expect(
      resolveAuthSiteUrl({
        origin: "https://saboru-demo.vercel.app",
        vercelEnv: "preview",
        vercelUrl: undefined,
        siteUrl: "https://saboru.vercel.app",
      }),
    ).toBe("https://saboru.vercel.app");
  });
});
