import { expect, test } from "@playwright/test";

test("header sticky con navegación, sesión y footer global", async ({
  page,
}) => {
  await page.goto("/");

  const header = page.getByRole("banner");
  await expect(header).toBeVisible();
  expect(
    await header.evaluate((element) => getComputedStyle(element).position),
  ).toBe("sticky");

  await expect(
    header.getByRole("link", { name: "SaborU, ir al inicio" }),
  ).toBeVisible();
  await expect(header.getByRole("link", { name: "Entrar" })).toBeVisible();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await expect(
      header.getByRole("button", { name: "Abrir menú" }),
    ).toBeVisible();
  } else {
    await expect(header.getByRole("link", { name: "Buscar" })).toBeVisible();
    await expect(
      header.getByRole("link", { name: "Privacidad" }),
    ).toBeVisible();
  }

  const footer = page.getByRole("contentinfo");
  await expect(footer).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Buscar locales" }),
  ).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Catálogo sin conexión" }),
  ).toBeVisible();
});

test("el skip-link lleva al contenido", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Saltar al contenido" });
  await expect(skip).toBeVisible();
  await expect(skip).toBeFocused();

  await skip.press("Enter");
  await expect(page).toHaveURL(/#contenido$/);
  await expect(page.locator("main#contenido")).toBeVisible();
});

test("el menú móvil abre, navega y cierra con Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Abrir menú" });
  await expect(toggle).toHaveAttribute("data-hydrated", "true");
  await toggle.click();

  const close = page.getByRole("button", { name: "Cerrar menú" });
  await expect(close).toHaveAttribute("aria-expanded", "true");

  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(nav.getByRole("link", { name: "Inicio" })).toBeVisible();
  await nav.getByRole("link", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/buscar$/);
  await expect(
    page.getByRole("button", { name: "Abrir menú" }),
  ).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Abrir menú" }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("404 y requiere conexión conservan la marca", async ({ page }) => {
  const response = await page.goto("/ruta-que-no-existe");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "No encontramos esa página" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Buscar locales" }),
  ).toBeVisible();

  await page.goto("/requiere-conexion");
  await expect(
    page.getByRole("heading", { name: "Requiere conexión" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver catálogo sin conexión" }),
  ).toBeVisible();
});
