import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function installServiceWorker(page: Page, context: BrowserContext) {
  await page.goto("/");
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  });
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const names = await caches.keys();
        for (const name of names) {
          const cache = await caches.open(name);
          for (const request of await cache.keys()) {
            if (request.url.includes("/requiere-conexion")) {
              return true;
            }
          }
        }
        return false;
      }),
    )
    .toBe(true);
  await context.setOffline(true);
}

test("la pantalla Requiere conexión se renderiza y se sirve precacheada", async ({
  page,
  context,
}) => {
  test.slow();

  // Render normal antes de activar el service worker.
  await page.goto("/requiere-conexion");
  await expect(
    page.getByRole("heading", { name: "Requiere conexión" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver catálogo sin conexión" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Salir" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Entrar" })).toHaveCount(0);

  await installServiceWorker(page, context);

  // La respuesta precacheada de la pantalla se sirve sin red.
  const cached = await page.evaluate(async () => {
    const response = await fetch("/requiere-conexion", { cache: "no-store" });
    return { status: response.status, html: await response.text() };
  });
  expect(cached.status).toBe(200);
  expect(cached.html).toContain("Requiere conexión");
  expect(cached.html).not.toContain("Cerrar sesión");
});
