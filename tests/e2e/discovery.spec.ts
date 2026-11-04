import { expect, test, type Page } from "@playwright/test";

const TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4/+3pfwAJrAPa/rj64gAAAABJRU5ErkJggg==",
  "base64",
);

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

async function mockMapNetwork(page: Page) {
  await page.route(/https:\/\/api\.maptiler\.com\/maps\/.*/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(OSM_STYLE),
    }),
  );
  await page.route(/https:\/\/[^/]*tile\.openstreetmap\.org\/.*/, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TILE }),
  );
}

test.describe("descubrimiento", () => {
  test("el texto y los chips actualizan mapa, lista y URL", async ({
    page,
  }) => {
    await mockMapNetwork(page);
    await page.goto("/");

    await expect(page.getByTestId("discovery-count")).toContainText(
      "7 locales",
    );
    await expect(page.getByTestId("map-marker")).toHaveCount(7);

    await page
      .getByRole("searchbox", { name: "Buscar en el catálogo" })
      .fill("arepas del bloque");
    await expect(page).toHaveURL(/q=arepas/);
    await expect(page.getByTestId("discovery-count")).toContainText("1 local");
    await expect(page.getByTestId("map-marker")).toHaveCount(1);
    await expect(
      page.getByRole("button", {
        name: "Ver Arepas del Bloque",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Ver Comedor La Cosecha",
        exact: true,
      }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "fritos", exact: true }).click();
    await expect(page).toHaveURL(/categoria=fritos/);
    await expect(page.getByTestId("discovery-count")).toContainText("1 local");

    await page.getByRole("button", { name: "Más barato" }).click();
    await expect(page).toHaveURL(/orden=price/);

    await page
      .getByTestId("discovery-search")
      .getByRole("button", { name: "Limpiar filtros" })
      .click();
    await expect(page.getByTestId("discovery-count")).toContainText(
      "7 locales",
    );
    await expect(
      page.getByRole("searchbox", { name: "Buscar en el catálogo" }),
    ).toHaveValue("");
  });

  test("una URL compartible restaura texto, chips y mapa", async ({ page }) => {
    await mockMapNetwork(page);
    await page.goto(
      "/buscar?q=cafe&categoria=bebidas&presupuesto=5000&orden=price",
    );

    await expect(
      page.getByRole("searchbox", { name: "Buscar en el catálogo" }),
    ).toHaveValue("cafe");
    await expect(
      page.getByRole("button", { name: "bebidas", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Más barato" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("discovery-count")).toContainText("1 local");
    await expect(page.getByTestId("map-marker")).toHaveCount(1);
    await expect(
      page.getByRole("button", {
        name: "Ver Café Biblioteca",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("muestra vacío y limpia filtros", async ({ page }) => {
    await mockMapNetwork(page);
    await page.goto("/buscar?presupuesto=1");

    await expect(page.getByTestId("discovery-empty")).toContainText(
      "No encontramos resultados",
    );

    await page
      .getByTestId("discovery-empty")
      .getByRole("button", { name: "Limpiar filtros" })
      .click();
    await expect(page.getByTestId("discovery-count")).toContainText(
      "7 locales",
      { timeout: 10_000 },
    );
  });

  test("abre el sheet en móvil y conserva la lista sin conexión", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      "solo aplica al perfil móvil",
    );

    await mockMapNetwork(page);
    await page.goto("/");
    await expect(page.getByTestId("discovery-place")).toHaveCount(7);

    await page
      .getByRole("button", { name: "Ver Comedor La Cosecha en el mapa" })
      .click();
    const sheet = page.getByTestId("discovery-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Ver ficha" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Cerrar" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(sheet).toHaveCount(0);

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByTestId("map-fallback")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("discovery-count")).toContainText("locales");
    await expect(
      page.getByRole("link", { name: "Sopa del día" }),
    ).toBeVisible();
    await context.setOffline(false);
  });
});
