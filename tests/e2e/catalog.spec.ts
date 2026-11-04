import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const BLOCK_CENTRAL = "00000000-0000-4000-8000-000000000001";
const SEED_PRODUCT = "20000000-0000-4000-8000-000000000001";
const SEED_ESTABLISHMENT = "seed-comedor-la-cosecha";

test.describe.configure({ mode: "serial" });

async function withDb<T>(fn: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function createFixture(options: { open: boolean; category?: string }) {
  const suffix = randomUUID();
  const establishmentId = randomUUID();
  const cheapId = randomUUID();
  const expensiveId = randomUUID();
  const category = options.category ?? `e2e-${suffix}`;
  const cheapName = `Barato ${suffix}`;
  const expensiveName = `Caro ${suffix}`;
  const schedule = options.open
    ? JSON.stringify({
        mon: [["00:00", "24:00"]],
        tue: [["00:00", "24:00"]],
        wed: [["00:00", "24:00"]],
        thu: [["00:00", "24:00"]],
        fri: [["00:00", "24:00"]],
        sat: [["00:00", "24:00"]],
        sun: [["00:00", "24:00"]],
      })
    : JSON.stringify({});

  await withDb(async (client) => {
    await client.query(
      `insert into public.establishments
         (id, name, slug, location, schedule, category, status, plan)
       values ($1, $2, $3,
               extensions.st_point(-73.3567, 5.552)::extensions.geography,
               $4::jsonb, $5, 'active', 'basic')`,
      [
        establishmentId,
        `Fixture ${suffix}`,
        `fixture-${suffix}`,
        schedule,
        category,
      ],
    );

    await client.query(
      `insert into public.products
         (id, establishment_id, name, price_cop, category, available)
       values ($1, $2, $3, $4, $5, true),
              ($6, $2, $7, $8, $5, true)`,
      [
        cheapId,
        establishmentId,
        cheapName,
        1500,
        category,
        expensiveId,
        expensiveName,
        1800,
      ],
    );
  });

  return {
    establishmentId,
    cheapId,
    expensiveId,
    category,
    cheapName,
    expensiveName,
  };
}

async function deleteFixture(establishmentId: string) {
  await withDb(async (client) => {
    await client.query(
      "delete from public.products where establishment_id = $1",
      [establishmentId],
    );
    await client.query("delete from public.establishments where id = $1", [
      establishmentId,
    ]);
  });
}

async function productHrefs(page: import("@playwright/test").Page) {
  return page
    .locator('a[href^="/producto/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
}

test.describe("catálogo", () => {
  test("la home muestra el descubrimiento y Destacado separado", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("searchbox", { name: "Buscar en el catálogo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Destacado$/ }),
    ).toBeVisible();
    await expect(
      page
        .locator('section[aria-labelledby="destacado"]')
        .getByRole("link", { name: "Café Biblioteca" }),
    ).toBeVisible();
  });

  test("buscar filtra por presupuesto y categoría y registra la búsqueda", async ({
    page,
  }) => {
    await page.goto(
      `/buscar?bloque=${BLOCK_CENTRAL}&presupuesto=10000&categoria=almuerzos`,
    );

    await expect(
      page.getByRole("link", { name: "Almuerzo del día" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sopa del día" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Almuerzo ejecutivo" }),
    ).toHaveCount(0);

    const count = await withDb(async (client) => {
      const result = await client.query<{ count: number }>(
        "select count(*)::int as count from public.search_events",
      );
      return result.rows[0]?.count ?? 0;
    });
    expect(count).toBeGreaterThan(0);
  });

  test("muestra el estado vacío sin resultados", async ({ page }) => {
    await page.goto(`/buscar?bloque=${BLOCK_CENTRAL}&presupuesto=1`);

    await expect(page.getByTestId("discovery-empty")).toContainText(
      "No encontramos resultados",
    );
  });

  test("la ficha de establecimiento muestra productos y reseñas", async ({
    page,
  }) => {
    await page.goto(`/establecimiento/${SEED_ESTABLISHMENT}`);

    await expect(
      page.getByRole("heading", { name: "Comedor La Cosecha" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Almuerzo del día" }),
    ).toBeVisible();
    await expect(
      page.getByText("Todavía no hay reseñas publicadas."),
    ).toBeVisible();
    await expect(page.getByText("Foto del local próximamente")).toBeAttached();
  });

  test("la ficha de producto muestra precio, stats y registra la vista", async ({
    page,
  }) => {
    await page.goto(`/producto/${SEED_PRODUCT}`);

    await expect(
      page.getByRole("heading", { name: "Almuerzo del día" }),
    ).toBeVisible();
    await expect(page.getByText(/10\.000/)).toBeVisible();
    await expect(
      page.getByText("Aún no hay suficientes reseñas"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reseñas" })).toBeVisible();

    const views = await withDb(async (client) => {
      const result = await client.query<{ count: number }>(
        "select count(*)::int as count from public.product_views where product_id = $1",
        [SEED_PRODUCT],
      );
      return result.rows[0]?.count ?? 0;
    });
    expect(views).toBeGreaterThan(0);
  });

  test("abierto ahora es determinista y el plan no cambia el orden", async ({
    page,
  }) => {
    const category = `e2e-${randomUUID()}`;
    const open = await createFixture({ open: true, category });
    const closed = await createFixture({ open: false, category });

    try {
      await page.goto(
        `/buscar?bloque=${BLOCK_CENTRAL}&presupuesto=2000&categoria=${category}&abierto=1`,
      );

      await expect(
        page.getByRole("link", { name: open.cheapName }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: open.expensiveName }),
      ).toBeVisible();

      const before = await productHrefs(page);
      expect(before).toEqual([
        `/producto/${open.cheapId}`,
        `/producto/${open.expensiveId}`,
      ]);

      await withDb(async (client) => {
        await client.query(
          "update public.establishments set plan = 'pro' where id = $1",
          [open.establishmentId],
        );
      });

      await page.reload();
      await expect(
        page.getByRole("link", { name: open.cheapName }),
      ).toBeVisible();
      expect(await productHrefs(page)).toEqual(before);

      await expect(
        page.getByRole("link", { name: closed.cheapName }),
      ).toHaveCount(0);
    } finally {
      await deleteFixture(open.establishmentId);
      await deleteFixture(closed.establishmentId);
    }
  });

  test("el snapshot es público, cacheable y sin datos privados", async ({
    request,
  }) => {
    const response = await request.get("/api/catalog/snapshot");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("public");

    const body = (await response.json()) as {
      version: string;
      generated_at: string;
      blocks: unknown[];
      establishments: { latitude: number | null }[];
      products: unknown[];
    };

    expect(body.version).toMatch(/^[a-f0-9]{16}$/);
    expect(typeof body.generated_at).toBe("string");
    expect(body.blocks.length).toBeGreaterThanOrEqual(6);
    expect(body.establishments.length).toBeGreaterThanOrEqual(7);
    expect(body.products.length).toBeGreaterThanOrEqual(23);
    expect(body.establishments[0]).toHaveProperty("latitude");

    const raw = JSON.stringify(body);
    expect(raw).not.toContain("owner_id");
    expect(raw).not.toContain("user_id");

    const fixture = await createFixture({ open: true });

    try {
      const before = await request.get("/api/catalog/snapshot");
      const beforeBody = (await before.json()) as { version: string };

      await withDb(async (client) => {
        await client.query(
          "update public.products set name = $1 where id = $2",
          [`Cambiado ${fixture.cheapId}`, fixture.cheapId],
        );
      });

      const after = await request.get("/api/catalog/snapshot");
      const afterBody = (await after.json()) as { version: string };

      expect(afterBody.version).not.toBe(beforeBody.version);
    } finally {
      await deleteFixture(fixture.establishmentId);
    }
  });
});
