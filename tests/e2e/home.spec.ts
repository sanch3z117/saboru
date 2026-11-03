import { expect, test } from "@playwright/test";

test("la portada se sirve y presenta la propuesta", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /qué comer, cuánto cuesta y qué tan lejos queda/i,
    }),
  ).toBeVisible();
});

test("la página sin conexión se puede abrir directamente", async ({ page }) => {
  const response = await page.goto("/offline");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", {
      name: /Catálogo sin conexión|Sin conexión/,
    }),
  ).toBeVisible();
});

test("expone el manifest y el service worker", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);

  const manifest = await manifestResponse.json();
  expect(manifest.name).toContain("SaborU");
  expect(manifest.display).toBe("standalone");

  const swResponse = await request.get("/sw.js");
  expect(swResponse.status()).toBe(200);
  expect(swResponse.headers()["content-type"]).toContain("javascript");
});
