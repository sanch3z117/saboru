import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const PRODUCT_ID = "20000000-0000-4000-8000-000000000001";
const ESTABLISHMENT_ID = "10000000-0000-4000-8000-000000000001";

function loadLocalEnv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

const LOCAL_ENV = loadLocalEnv();
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  LOCAL_ENV.NEXT_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  LOCAL_ENV.SUPABASE_SERVICE_ROLE_KEY ??
  "";

type MailpitList = { messages: { ID: string; To: { Address: string }[] }[] };

async function withDb<T>(fn: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function createUserViaApi(email: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, email_confirm: true }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo crear el usuario: ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Revisa tu correo");

  let link = "";
  await expect
    .poll(
      async () => {
        const response = await fetch(`${MAILPIT_URL}/api/v1/messages`);
        if (!response.ok) return "";
        const data = (await response.json()) as MailpitList;
        const message = data.messages.find((item) =>
          item.To.some((to) => to.Address === email),
        );
        if (!message) return "";
        const fullResponse = await fetch(
          `${MAILPIT_URL}/api/v1/message/${message.ID}`,
        );
        if (!fullResponse.ok) return "";
        const full = (await fullResponse.json()) as {
          Text: string;
          HTML: string;
        };
        const body = full.Text || full.HTML || "";
        link =
          body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/)?.[0] ??
          "";
        return link;
      },
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe("");

  await page.goto(link);
  await expect(
    page.getByRole("button", { name: /Salir|Cerrar sesión/ }).first(),
  ).toBeVisible();
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
      snapshot?: {
        products?: { name: string }[];
        reviews?: { comment: string | null }[];
      };
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

async function waitForSnapshot(page: Page, comment: string) {
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
        const hasProduct = Boolean(
          snapshot?.products?.some(
            (product) => product.name === "Almuerzo del día",
          ),
        );
        const hasReview =
          comment === "" ||
          Boolean(
            snapshot?.reviews?.some((review) => review.comment === comment),
          );
        return hasProduct && hasReview;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
}

async function waitForViewer(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("saboru:viewer")),
    )
    .not.toBeNull();
}

async function openOfflineProduct(page: Page) {
  await page.goto("/offline");
  await page.getByLabel("Categoría").selectOption("almuerzos");
  await page.getByRole("button", { name: /Almuerzo del día/ }).first().click();
}

test.describe("escritura offline", () => {
  test("reseña pendiente, rechazo por 30 días, reporte y favorito", async ({
    page,
    context,
  }) => {
    test.slow();
    const suffix = randomUUID();
    const email = `e2e.sync.${suffix}@uptc.edu.co`;
    const authorEmail = `e2e.sync.author.${suffix}@uptc.edu.co`;
    let userId = "";
    let authorId = "";
    const foreignReviewComment = `Reseña ajena ${suffix.slice(0, 8)}`;

    try {
      userId = await createUserViaApi(email);
      authorId = await createUserViaApi(authorEmail);

      await withDb(async (client) => {
        await client.query(
          `insert into public.reviews
             (client_id, user_id, product_id, establishment_id,
              rating_sabor, rating_cantidad, rating_precio,
              rating_presentacion, rating_calidad_precio, comment)
           values (gen_random_uuid(), $1, $2, $3, 3, 3, 3, 3, 3, $4)`,
          [authorId, PRODUCT_ID, ESTABLISHMENT_ID, foreignReviewComment],
        );
      });

      await login(page, email);
      await page.goto(`/producto/${PRODUCT_ID}`);
      await waitForViewer(page);
      await waitForSnapshot(page, foreignReviewComment);

      await context.setOffline(true);

      // La app offline está cacheada por el SW; abrimos el producto.
      await openOfflineProduct(page);

      await expect(
        page.getByRole("heading", { name: "Escribe tu reseña" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Guardar", exact: true }),
      ).toBeVisible();

      for (const criterion of [
        "rating_sabor",
        "rating_cantidad",
        "rating_precio",
        "rating_presentacion",
        "rating_calidad_precio",
      ]) {
        await page.locator(`input[name="${criterion}"][value="5"]`).check();
      }
      await page.locator("#off-comment").fill("Reseña offline E2E");
      await page.getByRole("button", { name: "Enviar reseña" }).click();
      await expect(
        page.locator('section[aria-labelledby="off-escribir"]'),
      ).toContainText("Pendiente de envío.");

      // Segunda reseña: el servidor la rechazará por la regla de 30 días.
      for (const criterion of [
        "rating_sabor",
        "rating_cantidad",
        "rating_precio",
        "rating_presentacion",
        "rating_calidad_precio",
      ]) {
        await page.locator(`input[name="${criterion}"][value="4"]`).check();
      }
      await page.locator("#off-comment").fill("Reseña offline E2E 2");
      await page.getByRole("button", { name: "Enviar reseña" }).click();
      await expect(
        page.locator('section[aria-labelledby="off-escribir"]'),
      ).toContainText("Pendiente de envío.");

      await page.getByRole("button", { name: "Guardar", exact: true }).click();
      await expect(page.getByText("Guardado. Pendiente de envío.")).toBeVisible();

      const foreignReview = page
        .getByRole("listitem")
        .filter({ hasText: foreignReviewComment });
      await foreignReview.getByRole("button", { name: "Reportar" }).click();
      await page
        .getByLabel("Motivo del reporte")
        .fill("Contenido ofensivo");
      await page.getByRole("button", { name: "Enviar reporte" }).click();

      await context.setOffline(false);
      await page.waitForTimeout(500);
      await page.goto("/offline");

      await expect
        .poll(
          () =>
            withDb(async (client) => {
              const result = await client.query<{ count: string }>(
                "select count(*)::text as count from public.reviews where user_id = $1",
                [userId],
              );
              return Number(result.rows[0]?.count ?? 0);
            }),
          { timeout: 25_000 },
        )
        .toBe(1);

      await expect
        .poll(
          () =>
            withDb(async (client) => {
              const result = await client.query<{ count: string }>(
                "select count(*)::text as count from public.favorites where user_id = $1",
                [userId],
              );
              return Number(result.rows[0]?.count ?? 0);
            }),
          { timeout: 25_000 },
        )
        .toBe(1);

      await expect
        .poll(
          () =>
            withDb(async (client) => {
              const result = await client.query<{ count: string }>(
                "select count(*)::text as count from public.review_reports where reporter_id = $1",
                [userId],
              );
              return Number(result.rows[0]?.count ?? 0);
            }),
          { timeout: 25_000 },
        )
        .toBe(1);

      await expect(page.locator('[aria-live="polite"]')).toContainText(
        "rechazado",
        { timeout: 20_000 },
      );
      await expect(page.locator('[aria-live="polite"]')).toContainText(
        "30 días",
      );

      // Quitar el favorito desde el modo offline (acción remove).
      await openOfflineProduct(page);
      await page
        .getByRole("button", { name: "Quitar de guardados" })
        .click();
      await expect
        .poll(
          () =>
            withDb(async (client) => {
              const result = await client.query<{ count: string }>(
                "select count(*)::text as count from public.favorites where user_id = $1",
                [userId],
              );
              return Number(result.rows[0]?.count ?? 0);
            }),
          { timeout: 25_000 },
        )
        .toBe(0);

      await page.goto(`/producto/${PRODUCT_ID}`);
      await expect(
        page
          .getByRole("region", { name: "Reseñas" })
          .getByText("Reseña offline E2E", { exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("region", { name: "Reseñas" })
          .getByText("Reseña offline E2E 2", { exact: true }),
      ).toHaveCount(0);
      await expect(page.getByText("Reseña verificada").first()).toBeVisible();
    } finally {
      await withDb(async (client) => {
        await client.query("delete from auth.users where id = any($1::uuid[])", [
          [userId, authorId].filter(Boolean),
        ]);
      });
    }
  });

  test("un admin no ve el formulario de reseña offline", async ({ page }) => {
    test.slow();
    const email = `e2e.sync.admin.${randomUUID()}@uptc.edu.co`;
    let adminId = "";

    try {
      adminId = await createUserViaApi(email);
      await withDb(async (client) => {
        await client.query(
          "update public.profiles set role = 'admin' where id = $1",
          [adminId],
        );
      });

      await login(page, email);
      await page.goto(`/producto/${PRODUCT_ID}`);
      await waitForViewer(page);
      await waitForSnapshot(page, "");

      await openOfflineProduct(page);

      await expect(
        page.getByRole("heading", { name: "Escribe tu reseña" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Guardar", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Solo estudiantes institucionales de la UPTC"),
      ).toBeVisible();
    } finally {
      await withDb(async (client) => {
        await client.query("delete from auth.users where id = $1", [adminId]);
      });
    }
  });

  test("un vendedor no ve el formulario de reseña offline", async ({ page }) => {
    test.slow();
    const email = `e2e.sync.vendor.${randomUUID()}@uptc.edu.co`;
    let vendorId = "";

    try {
      vendorId = await createUserViaApi(email);
      await withDb(async (client) => {
        await client.query(
          "update public.profiles set role = 'vendor' where id = $1",
          [vendorId],
        );
      });

      await login(page, email);
      await page.goto(`/producto/${PRODUCT_ID}`);
      await waitForViewer(page);
      await waitForSnapshot(page, "");

      await openOfflineProduct(page);

      await expect(
        page.getByRole("heading", { name: "Escribe tu reseña" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Guardar", exact: true }),
      ).toHaveCount(0);
    } finally {
      await withDb(async (client) => {
        await client.query("delete from auth.users where id = $1", [vendorId]);
      });
    }
  });
});

test("sin sesión /api/sync responde 401", async ({ request }) => {
  const response = await request.post("/api/sync", {
    data: { operations: [] },
  });

  expect(response.status()).toBe(401);
});
