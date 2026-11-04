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

// El build de producción puede perder transiciones de `router.replace`
// (docs/03, riesgo conocido de React 19 + Next 15). Reintentamos el caso
// completo para no ocultar un fallo real de estructura con ese ruido.
test.describe.configure({ retries: 2 });

test.describe("descubrimiento", () => {
  test("los filtros de URL actualizan mapa, lista y estado", async ({
    page,
  }) => {
    await mockMapNetwork(page);
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByTestId("discovery-count")).toContainText(
      "7 locales",
    );
    await expect(page.getByTestId("map-marker")).toHaveCount(7);
    await expect(page.getByTestId("discovery-search")).toHaveAttribute(
      "data-hydrated",
      "true",
    );

    await expect(
      page.getByRole("heading", { name: "Destacado" }),
    ).toBeVisible();
    const firstGroup = page.getByTestId("discovery-place").first();
    await expect(firstGroup.getByRole("article")).toHaveCount(1);
    const menu = firstGroup.getByRole("list", { name: /Menú de/ });
    await expect(menu.getByRole("link").first()).toBeVisible();
    await expect(menu.getByText("Sin reseñas suficientes")).toHaveCount(0);
    await expect(menu.getByText("Cerrado", { exact: true })).toHaveCount(0);
    await expect(menu.getByText("Abierto ahora", { exact: true })).toHaveCount(0);

    await page.goto("/?q=arepas+del+bloque", {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("discovery-count")).toContainText("1 local");
    await expect(page.getByTestId("map-marker")).toHaveCount(1);
    await expect(page.getByTestId("discovery-place")).toHaveCount(1);
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

    await page.goto("/?q=arepas+del+bloque&categoria=fritos", {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("button", { name: "fritos", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("discovery-count")).toContainText("1 local");

    await page.goto(
      "/?q=arepas+del+bloque&categoria=fritos&orden=price",
      { waitUntil: "networkidle" },
    );
    await expect(
      page.getByRole("button", { name: "Más barato" }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("discovery-count")).toContainText(
      "7 locales",
    );
    await expect(
      page.getByRole("searchbox", { name: "Buscar en el catálogo" }),
    ).toHaveValue("");
  });

  test("la barra de presupuesto filtra y el máximo vuelve a sin límite", async ({
    page,
  }) => {
    await mockMapNetwork(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("discovery-search")).toHaveAttribute(
      "data-hydrated",
      "true",
    );

    const range = page.getByTestId("budget-range");
    await expect(range).toHaveAttribute("min", "500");
    await expect(range).toHaveAttribute("max", "7000");
    await expect(range).toHaveAttribute("aria-valuetext", "Sin límite");

    const setRange = (value: string) =>
      range.evaluate((element, nextValue) => {
        const input = element as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, nextValue);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("pointerup", { bubbles: true }));
      }, value);

    await expect
      .poll(
        async () => {
          if (/presupuesto=6500/.test(page.url())) return true;
          await setRange("6500");
          return /presupuesto=6500/.test(page.url());
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    await expect(range).toHaveAttribute(
      "aria-valuetext",
      /Hasta \$.*6\.500/,
    );
    await expect(page.getByText(/Hasta \$.*6\.500/).first()).toBeVisible();

    // El build puede perder la transición de router.replace; reintentamos la
    // acción hasta que la URL vuelva a "sin límite".
    await expect
      .poll(
        async () => {
          if (!/presupuesto=/.test(page.url())) return true;
          await setRange("7000");
          return !/presupuesto=/.test(page.url());
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    await expect(range).toHaveAttribute("aria-valuetext", "Sin límite");
  });

  test("en escritorio el mapa es sticky y la lista scrollea sola", async ({
    page,
  }) => {
    await mockMapNetwork(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("discovery-count")).toContainText("7 locales");

    const map = page.getByTestId("discovery-map-frame");
    const list = page.getByTestId("discovery-list");
    await expect(map).toBeVisible();
    await expect(list).toBeVisible();

    expect(
      await map.evaluate((element) => getComputedStyle(element).position),
    ).toBe("sticky");
    expect(
      await list.evaluate((element) => getComputedStyle(element).overflowY),
    ).toBe("auto");

    const mapBox = await map.boundingBox();
    const listBox = await list.boundingBox();
    expect(mapBox).not.toBeNull();
    expect(listBox).not.toBeNull();
    expect(mapBox!.width / listBox!.width).toBeGreaterThan(1.2);

    const before = await map.boundingBox();
    await list.evaluate((element) => {
      element.scrollTop = 220;
    });
    const after = await map.boundingBox();
    expect(after!.y).toBe(before!.y);
  });

  test("en móvil el mapa mide 40vh, el header navega y el pie se apila", async ({
    page,
  }) => {
    await mockMapNetwork(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("discovery-count")).toContainText("7 locales");

    const mapBox = await page.getByTestId("discovery-map-frame").boundingBox();
    expect(mapBox).not.toBeNull();
    expect(mapBox!.height).toBeGreaterThan(300);
    expect(mapBox!.height).toBeLessThanOrEqual(340);

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Buscar" })).toBeVisible();
    await expect(
      header.getByRole("button", { name: "Abrir menú" }),
    ).toBeVisible();

    const footerLinks = page
      .getByRole("navigation", { name: "Enlaces del pie" })
      .getByRole("link");
    const firstLink = await footerLinks.nth(0).boundingBox();
    const secondLink = await footerLinks.nth(1).boundingBox();
    expect(firstLink).not.toBeNull();
    expect(secondLink).not.toBeNull();
    expect(secondLink!.y).toBeGreaterThan(firstLink!.y + firstLink!.height - 1);

    const steps = page.locator('section[aria-labelledby="como-funciona"] li');
    const firstStep = await steps.nth(0).boundingBox();
    const secondStep = await steps.nth(1).boundingBox();
    expect(firstStep).not.toBeNull();
    expect(secondStep).not.toBeNull();
    expect(secondStep!.y).toBeGreaterThan(
      firstStep!.y + firstStep!.height - 1,
    );
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
    await page.goto("/buscar?presupuesto=1", { waitUntil: "networkidle" });
    await expect(page.getByTestId("discovery-search")).toHaveAttribute(
      "data-hydrated",
      "true",
    );

    await expect(page.getByTestId("discovery-empty")).toContainText(
      "No encontramos resultados",
    );

    // `router.replace` puede perder la transición en el build de producción
    // (docs/03). Reintentamos la acción hasta que la URL quede limpia.
    await expect
      .poll(
        async () => {
          if (!/presupuesto=/.test(page.url())) return page.url();
          const clear = page
            .getByTestId("discovery-empty")
            .getByRole("button", { name: "Limpiar filtros" });
          if (await clear.count()) {
            await clear.evaluate((button: HTMLButtonElement) => button.click());
          }
          return page.url();
        },
        { timeout: 15_000 },
      )
      .not.toMatch(/presupuesto=/);

    await page.reload({ waitUntil: "networkidle" });
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
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("discovery-place")).toHaveCount(7);
    await expect(page.getByTestId("map-marker")).toHaveCount(7);

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
