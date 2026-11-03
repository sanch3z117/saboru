import { expect, test } from "@playwright/test";

test("las rutas de cuenta sin red sirven la pantalla Requiere conexión", async ({
  page,
  context,
}) => {
  test.slow();

  // La pantalla se renderiza con normalidad antes de activar el service worker.
  await page.goto("/requiere-conexion");
  await expect(
    page.getByRole("heading", { name: "Requiere conexión" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver catálogo sin conexión" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Salir" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Entrar" })).toHaveCount(0);

  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);

  // El SW responde el gate para las rutas privadas. Se comprueba con fetch
  // para no depender del timing de una navegación completa en CI.
  for (const path of [
    "/panel",
    "/admin",
    "/login",
    "/registro",
    "/auth/callback",
  ]) {
    const fallback = await page.evaluate(async (url) => {
      const response = await fetch(url, { cache: "no-store" });
      return {
        header: response.headers.get("x-saboru-fallback"),
        html: (await response.text()).includes("Requiere conexión"),
      };
    }, path);

    expect(fallback).toEqual({ header: "gate", html: true });
  }

  // La pantalla está precacheada y se sirve sin red.
  const cached = await page.evaluate(async () => {
    const response = await fetch("/requiere-conexion", { cache: "no-store" });
    return { status: response.status, html: await response.text() };
  });
  expect(cached.status).toBe(200);
  expect(cached.html).toContain("Requiere conexión");
  expect(cached.html).not.toContain("Cerrar sesión");
});
