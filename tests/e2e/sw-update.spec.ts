import { expect, test } from "@playwright/test";

test("avisa de una versión nueva y no recarga hasta aceptar", async ({
  page,
}) => {
  test.slow();

  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await page.evaluate(() => {
    (window as unknown as { __noReload?: boolean }).__noReload = true;
  });

  // SW de prueba (solo con E2E_SW_TEST=1): instala y queda en waiting.
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/api/e2e/sw-test", {
      scope: "/",
      updateViaCache: "none",
    });
  });

  await expect(
    page.getByText("Hay una versión nueva de SaborU"),
  ).toBeVisible({ timeout: 30_000 });

  // No recarga sola: la marca de la página sigue viva.
  expect(
    await page.evaluate(
      () => (window as unknown as { __noReload?: boolean }).__noReload,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Actualizar" }).click();

  await expect
    .poll(async () => {
      try {
        return await page.evaluate(
          () => (window as unknown as { __noReload?: boolean }).__noReload,
        );
      } catch {
        // La recarga está en curso: el contexto se destruye.
        return undefined;
      }
    })
    .toBeUndefined();

  await expect
    .poll(async () => {
      try {
        return await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration?.active?.scriptURL ?? "";
        });
      } catch {
        return "navegando";
      }
    })
    .toContain("/api/e2e/sw-test");
});
