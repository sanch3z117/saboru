import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const OPEN_SCHEDULE = {
  mon: [
    ["00:00", "12:00"],
    ["12:00", "00:00"],
  ],
  tue: [
    ["00:00", "12:00"],
    ["12:00", "00:00"],
  ],
  wed: [
    ["00:00", "12:00"],
    ["12:00", "00:00"],
  ],
  thu: [
    ["00:00", "12:00"],
    ["12:00", "00:00"],
  ],
  fri: [
    ["00:00", "12:00"],
    ["12:00", "00:00"],
  ],
  sat: [
    ["00:00", "12:00"],
    ["12:00", "00:00"],
  ],
  sun: [
    ["00:00", "12:00"],
    ["12:00", "00:00"],
  ],
};

type Fixture = {
  establishmentIds: string[];
  productIds: string[];
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

async function createFixture(): Promise<Fixture> {
  const suffix = randomUUID();
  const openId = randomUUID();
  const closedId = randomUUID();
  const openProduct = randomUUID();
  const closedProduct = randomUUID();

  await withDb(async (client) => {
    await client.query(
      `insert into public.establishments
         (id, name, slug, location, schedule, category, status)
       values
         ($1, $2, $3,
          extensions.st_point(-73.3566, 5.5521)::extensions.geography,
          $4::jsonb, 'e2e-offline', 'active'),
         ($5, $6, $7,
          extensions.st_point(-73.3565, 5.5522)::extensions.geography,
          '{}'::jsonb, 'e2e-offline', 'active')`,
      [
        openId,
        `Abierto 24h local ${suffix.slice(0, 8)}`,
        `offline-open-${suffix}`,
        JSON.stringify(OPEN_SCHEDULE),
        closedId,
        `Cerrado local ${suffix.slice(0, 8)}`,
        `offline-closed-${suffix}`,
      ],
    );

    await client.query(
      `insert into public.products
         (id, establishment_id, name, description, price_cop, category, available)
       values
         ($1, $2, 'Abierto 24h E2E', 'Siempre disponible para la prueba', 7000, 'e2e-offline', true),
         ($3, $4, 'Cerrado E2E', 'Nunca abierto para la prueba', 6500, 'e2e-offline', true)`,
      [openProduct, openId, closedProduct, closedId],
    );
  });

  return {
    establishmentIds: [openId, closedId],
    productIds: [openProduct, closedProduct],
  };
}

async function deleteFixture(fixture: Fixture) {
  await withDb(async (client) => {
    await client.query(
      "delete from public.products where id = any($1::uuid[])",
      [fixture.productIds],
    );
    await client.query(
      "delete from public.establishments where id = any($1::uuid[])",
      [fixture.establishmentIds],
    );
  });
}

async function readStoredSnapshot(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("saboru-offline", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("snapshot")) {
        request.result.createObjectStore("snapshot", { keyPath: "id" });
      }
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise<{
      snapshot?: { products?: { name: string }[] };
    } | null>((resolve, reject) => {
      const get = db
        .transaction("snapshot")
        .objectStore("snapshot")
        .get("catalog");
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => reject(get.error);
    });
    db.close();
    return record?.snapshot ?? null;
  });
}

test.describe("catálogo offline", () => {
  test("busca y abre una ficha desde el snapshot sin red", async ({
    page,
    context,
  }) => {
    test.slow();
    const fixture = await createFixture();

    try {
      await page.goto("/");
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
      await page.reload();
      await expect
        .poll(() =>
          page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
        )
        .toBe(true);

      await expect
        .poll(
          async () => {
            const snapshot = await readStoredSnapshot(page);
            return Boolean(
              snapshot?.products?.some(
                (product) => product.name === "Abierto 24h E2E",
              ),
            );
          },
          { timeout: 20_000 },
        )
        .toBe(true);

      await context.setOffline(true);
      await page.goto("/offline");

      await expect(
        page.getByRole("heading", { name: "Catálogo sin conexión" }),
      ).toBeVisible();
      await expect(page.getByText(/Catálogo actualizado el/)).toBeVisible();
      await expect(
        page.getByRole("main").getByText("Sin conexión", { exact: true }),
      ).toBeVisible();

      await page.getByLabel("Categoría").selectOption("e2e-offline");
      await expect(page.getByText("2 resultados")).toBeVisible();

      await page.getByRole("checkbox", { name: "Abierto ahora" }).check();
      await expect(page.getByText("1 resultado")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Abierto 24h E2E/ }),
      ).toBeVisible();
      await expect(page.getByText("Cerrado E2E")).toHaveCount(0);

      await page.getByRole("button", { name: /Abierto 24h E2E/ }).click();

      await expect(
        page.getByRole("heading", { level: 1, name: "Abierto 24h E2E" }),
      ).toBeVisible();
      await expect(page.getByText("$ 7.000")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Horario" }),
      ).toBeVisible();
      await expect(page.getByText("00:00–12:00 · 12:00–00:00")).toHaveCount(7);

      await page.getByRole("button", { name: "Volver a resultados" }).click();
      await expect(page.getByText("1 resultado")).toBeVisible();
    } finally {
      await context.setOffline(false);
      await deleteFixture(fixture);
    }
  });
});
