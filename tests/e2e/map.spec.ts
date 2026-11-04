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

const SEED_NAMES = [
  "Arepas del Bloque",
  "Café Biblioteca",
  "Comedor La Cosecha",
  "Food Truck Administrativo",
  "Jugos y Frutas",
  "Panadería Laboratorios",
  "Parrilla Central",
] as const;

async function mockMapNetwork(page: Page) {
  // Si el entorno tiene NEXT_PUBLIC_MAPTILER_KEY, servimos un estilo OSM
  // equivalente para que la prueba no dependa de internet ni de la cuota.
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

async function expectSeedMarkers(page: Page) {
  for (const name of SEED_NAMES) {
    await expect(
      page.getByRole("button", { name: `Ver ${name}`, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
  }
  await expect(page.getByTestId("map-block-label")).toHaveCount(6);
}

test.describe("mapa del campus", () => {
  test("muestra los 7 locales, 6 bloques y sincroniza la selección", async ({
    page,
  }, testInfo) => {
    const cspErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text())) {
        cspErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await mockMapNetwork(page);
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Mapa del campus" }),
    ).toBeVisible();
    await expectSeedMarkers(page);
    await expect(page.getByTestId("map-fallback")).toHaveCount(0);

    await page
      .getByRole("button", {
        name: "Ver Food Truck Administrativo",
        exact: true,
      })
      .click();

    if (testInfo.project.name === "mobile") {
      await expect(page.getByTestId("discovery-sheet")).toContainText(
        "Food Truck Administrativo",
      );
    } else {
      await expect(
        page.getByRole("button", {
          name: "Ver Food Truck Administrativo en el mapa",
        }),
      ).toHaveAttribute("aria-pressed", "true");
    }

    expect(pageErrors).toEqual([]);
    expect(cspErrors).toEqual([]);
  });

  test("usa la geolocalización con permiso y muestra el punto del usuario", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({
      latitude: 5.5521,
      longitude: -73.35664,
    });
    await mockMapNetwork(page);
    await page.goto("/");

    await expectSeedMarkers(page);
    await page.getByRole("button", { name: "Usar mi ubicación" }).click();

    await expect(page.getByTestId("map-user-marker")).toBeVisible();
    await expect(
      page.getByText("Viendo distancias desde tu ubicación."),
    ).toBeVisible();
  });

  test("sin permiso cae al centro del campus y lo avisa", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (
            _success: PositionCallback,
            error?: PositionErrorCallback,
          ) => {
            error?.({
              code: 1,
              message: "denied",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          },
        },
      });
    });
    await mockMapNetwork(page);
    await page.goto("/");

    await expectSeedMarkers(page);
    await page.getByRole("button", { name: "Usar mi ubicación" }).click();

    await expect(page.getByText(/Usando .* como referencia/)).toBeVisible();
    await expect(page.getByTestId("map-user-marker")).toHaveCount(0);
  });

  test("si MapTiler rechaza el dominio cae a OpenStreetMap", async ({
    page,
  }) => {
    await page.route(/https:\/\/api\.maptiler\.com\/.*/, (route) =>
      route.abort(),
    );
    await page.route(/https:\/\/[^/]*tile\.openstreetmap\.org\/.*/, (route) =>
      route.fulfill({ status: 200, contentType: "image/png", body: TILE }),
    );

    await page.goto("/");

    await expect(page.getByTestId("campus-map")).toHaveAttribute(
      "data-map-provider",
      "osm",
      { timeout: 30_000 },
    );
    await expectSeedMarkers(page);
    await expect(page.getByTestId("map-fallback")).toHaveCount(0);
  });

  test("si fallan las teselas muestra el listado y el reintento", async ({
    page,
  }) => {
    await page.route(/https:\/\/[^/]*tile\.openstreetmap\.org\/.*/, (route) =>
      route.abort(),
    );
    await page.route(/https:\/\/api\.maptiler\.com\/.*/, (route) =>
      route.abort(),
    );

    await page.goto("/");

    const fallback = page.getByTestId("map-fallback");
    await expect(fallback).toBeVisible({ timeout: 30_000 });
    await expect(fallback).toContainText("El mapa no está disponible");
    await expect(
      fallback.getByRole("button", { name: "Reintentar" }),
    ).toBeVisible();

    await expect(page.getByTestId("discovery-count")).toContainText("locales");
    await expect(
      page.getByRole("link", { name: "Sopa del día" }),
    ).toBeVisible();
  });
});
