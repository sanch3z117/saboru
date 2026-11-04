import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4/+3pfwAJrAPa/rj64gAAAABJRU5ErkJggg==",
  "base64",
);

type Fixture = {
  establishmentId: string;
  productId: string;
  slug: string;
  name: string;
  productName: string;
};

async function withDb<T>(fn: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function createFixture(withPhotos: boolean): Promise<Fixture> {
  const suffix = randomUUID();
  const establishmentId = randomUUID();
  const productId = randomUUID();
  const name = `Ficha ${suffix.slice(0, 8)}`;
  const productName = `Producto ficha ${suffix.slice(0, 8)}`;
  const slug = `ficha-${suffix}`;

  await withDb(async (client) => {
    await client.query(
      `insert into public.establishments
        (id, name, slug, description, location, schedule, category, photos,
         status, plan)
       values ($1, $2, $3, $4,
         extensions.st_point(-73.3567, 5.552)::extensions.geography,
         $5::jsonb, 'e2e-ficha', $6::text[], 'active', 'featured')`,
      [
        establishmentId,
        name,
        slug,
        "Descripción pública de la ficha de prueba.",
        JSON.stringify({
          mon: [["00:00", "24:00"]],
          tue: [["00:00", "24:00"]],
          wed: [["00:00", "24:00"]],
          thu: [["00:00", "24:00"]],
          fri: [["00:00", "24:00"]],
          sat: [["00:00", "24:00"]],
          sun: [["00:00", "24:00"]],
        }),
        withPhotos ? ["/demo/local-comedor.webp"] : [],
      ],
    );
    await client.query(
      `insert into public.products
        (id, establishment_id, name, description, price_cop, category,
         photo_url, available)
       values ($1, $2, $3, $4, 12345, 'e2e-ficha', $5, true)`,
      [
        productId,
        establishmentId,
        productName,
        "Producto de prueba con foto demo.",
        withPhotos ? "/demo/product-almuerzo.webp" : null,
      ],
    );
  });

  return { establishmentId, productId, slug, name, productName };
}

async function deleteFixture(fixture: Fixture) {
  await withDb(async (client) => {
    await client.query("delete from public.products where id = $1", [
      fixture.productId,
    ]);
    await client.query("delete from public.establishments where id = $1", [
      fixture.establishmentId,
    ]);
  });
}

async function mockMapNetwork(page: Page) {
  await page.route(/https:\/\/api\.maptiler\.com\/maps\/.*/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    }),
  );
  await page.route(/https:\/\/[^/]*tile\.openstreetmap\.org\/.*/, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TILE }),
  );
}

test.describe("cartelera y fichas con fotos", () => {
  test("la home muestra cards con foto, Destacado y Cómo funciona sin duplicar mapa", async ({
    page,
  }) => {
    const fixture = await createFixture(true);
    await mockMapNetwork(page);

    try {
      await page.goto("/");

      const card = page
        .locator("article")
        .filter({ hasText: fixture.name })
        .first();
      await expect(card).toBeVisible();
      await expect(
        card.getByRole("img", { name: `Foto de ${fixture.name}` }),
      ).toBeVisible();
      await expect(card).toContainText("Desde $ 12.345");
      await expect(card).toContainText("Destacado");
      await expect(card).toContainText("Activo");
      await expect(card).toContainText("Abierto ahora");
      await expect(
        card.getByRole("link", { name: "Ver ficha" }),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Cómo funciona" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Busca por antojo" }),
      ).toBeVisible();
      await expect(page.getByTestId("campus-map")).toHaveCount(1);
      await expect(
        page.getByRole("searchbox", { name: "Buscar en el catálogo" }),
      ).toHaveCount(1);
    } finally {
      await deleteFixture(fixture);
    }
  });

  test("la ficha de local muestra foto, mapa, cómo llegar, productos y reseñas", async ({
    page,
  }) => {
    const fixture = await createFixture(true);
    await mockMapNetwork(page);

    try {
      await page.goto(`/establecimiento/${fixture.slug}`);

      await expect(
        page.getByRole("heading", { level: 1, name: fixture.name }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: `Foto de ${fixture.name}` }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Mapa y cómo llegar" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute(
        "href",
        /google\.com\/maps\/dir/,
      );
      await expect(
        page.getByRole("heading", { name: "Horario" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: fixture.productName }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: `Foto de ${fixture.productName}` }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Reseñas" }),
      ).toBeVisible();
    } finally {
      await deleteFixture(fixture);
    }
  });

  test("la ficha de producto muestra foto, precio grande, criterios y estrellas", async ({
    page,
  }) => {
    const fixture = await createFixture(true);

    try {
      await page.goto(`/producto/${fixture.productId}`);

      await expect(
        page.getByRole("heading", { level: 1, name: fixture.productName }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: `Foto de ${fixture.productName}` }),
      ).toBeVisible();
      await expect(page.getByText("$ 12.345")).toBeVisible();
      await expect(page.getByRole("link", { name: "Calificar" })).toBeVisible();
      await expect(
        page.getByText("Aún no hay suficientes reseñas"),
      ).toBeVisible();
    } finally {
      await deleteFixture(fixture);
    }
  });

  test("sin foto usa el placeholder de marca", async ({ page }) => {
    const fixture = await createFixture(false);

    try {
      await page.goto(`/establecimiento/${fixture.slug}`);
      await expect(page.getByText("Foto del local próximamente")).toBeAttached();
      await expect(page.getByText("Sin foto")).toBeAttached();
    } finally {
      await deleteFixture(fixture);
    }
  });

  test("las imágenes OG responden y no exponen datos privados", async ({
    request,
  }) => {
    const establishment = await request.get(
      "/establecimiento/seed-comedor-la-cosecha/opengraph-image",
    );
    expect(establishment.status()).toBe(200);
    expect(establishment.headers()["content-type"]).toContain("image/png");

    const product = await request.get(
      "/producto/20000000-0000-4000-8000-000000000001/opengraph-image",
    );
    expect(product.status()).toBe(200);
    expect(product.headers()["content-type"]).toContain("image/png");

    const html = await (
      await request.get("/establecimiento/seed-comedor-la-cosecha")
    ).text();
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image"');
    expect(html).not.toContain("owner_id");
  });
});
