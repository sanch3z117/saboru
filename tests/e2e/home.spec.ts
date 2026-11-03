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

test("muestra la política de privacidad y el consentimiento de registro", async ({
  page,
}) => {
  await page.goto("/privacidad");
  await expect(
    page.getByRole("heading", { name: "Política de privacidad" }),
  ).toBeVisible();

  await page.goto("/registro");
  const consent = page.getByRole("checkbox", {
    name: /política de privacidad/i,
  });
  await expect(consent).toBeVisible();
  await expect(consent).not.toBeChecked();
  await expect(consent).toHaveAttribute("required", "");
  await expect(
    page.getByRole("link", { name: "política de privacidad" }),
  ).toHaveAttribute("href", "/privacidad");
});

test("envía cabeceras de seguridad y CSP report-only", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["content-security-policy-report-only"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["strict-transport-security"]).toContain("max-age=31536000");
  expect(headers["strict-transport-security"]).not.toContain("preload");
});

test("expone el manifest y el service worker", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);

  const manifest = await manifestResponse.json();
  expect(manifest.name).toContain("SaborU");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(Array.isArray(manifest.icons)).toBe(true);
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

  const swResponse = await request.get("/sw.js");
  expect(swResponse.status()).toBe(200);
  expect(swResponse.headers()["content-type"]).toContain("javascript");
});
