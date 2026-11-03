import { expect, test } from "@playwright/test";

test.describe("service worker y punto de entrada offline", () => {
  test("sin red la navegación cae en /offline y no se cachea HTML/RSC", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);

    const precached = await page.evaluate(async () => {
      const names = await caches.keys();
      const out: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          out.push(request.url);
        }
      }
      return out;
    });
    expect(precached.some((url) => url.includes("/offline"))).toBe(true);

    // Rutas con sesión y RSC: deben quedar fuera de Cache Storage.
    await page.goto("/login");
    await page.goto("/producto/20000000-0000-4000-8000-000000000001");
    await page.waitForLoadState("networkidle");

    const stored = await page.evaluate(async () => {
      const names = await caches.keys();
      const out: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          out.push(`${name} ${request.url}`);
        }
      }
      return out;
    });

    const stale = stored.filter((entry) => {
      const url = new URL(entry.slice(entry.indexOf(" ") + 1));
      if (url.pathname.startsWith("/_next/")) {
        return false;
      }
      return (
        url.pathname.startsWith("/producto/") ||
        url.pathname === "/login" ||
        url.pathname.startsWith("/panel") ||
        url.searchParams.has("_rsc")
      );
    });

    expect(stale).toEqual([]);
    expect(stored.some((entry) => entry.includes("pages-rsc"))).toBe(false);

    await context.setOffline(true);
    await page.goto("/buscar").catch(() => undefined);

    await expect(
      page.getByRole("heading", { name: "No hay conexión" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Reintentar|Volver a intentar/ }),
    ).toBeVisible();
  });
});
