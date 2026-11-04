import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const PRODUCT_ID = "20000000-0000-4000-8000-000000000001";

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

type MailpitMessage = { ID: string; To: { Address: string }[] };
type MailpitList = { messages: MailpitMessage[] };
type MailpitFull = { Text: string; HTML: string };

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

async function getMagicLink(email: string) {
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
        const full = (await fullResponse.json()) as MailpitFull;
        const body = full.Text || full.HTML || "";
        link =
          body.match(
            /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/,
          )?.[0] ?? "";
        return link;
      },
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe("");

  return link;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Revisa tu correo");

  const link = await getMagicLink(email);
  await page.goto(link);
  await expect(
    page.getByRole("button", { name: /Salir|Cerrar sesión/ }).first(),
  ).toBeVisible();
}

async function deleteReviewsAndUsers(reviewIds: string[], userIds: string[]) {
  await withDb(async (client) => {
    if (reviewIds.length > 0) {
      await client.query(
        "delete from public.review_reports where review_id = any($1::uuid[])",
        [reviewIds],
      );
      await client.query(
        "delete from public.reviews where id = any($1::uuid[])",
        [reviewIds],
      );
    }
    if (userIds.length > 0) {
      await client.query("delete from auth.users where id = any($1::uuid[])", [
        userIds,
      ]);
    }
  });
}

async function createProductFixture() {
  const suffix = randomUUID();
  const establishmentId = randomUUID();
  const productId = randomUUID();

  await withDb(async (client) => {
    await client.query(
      `insert into public.establishments
         (id, name, slug, location, schedule, category, status)
       values ($1, $2, $3,
               extensions.st_point(-73.3567, 5.552)::extensions.geography,
               '{}'::jsonb, 'e2e', 'active')`,
      [
        establishmentId,
        `Fixture reseñas ${suffix}`,
        `fixture-review-${suffix}`,
      ],
    );
    await client.query(
      `insert into public.products
         (id, establishment_id, name, price_cop, category, available)
       values ($1, $2, 'Producto E2E', 8000, 'e2e', true)`,
      [productId, establishmentId],
    );
  });

  return { establishmentId, productId };
}

async function deleteProductFixture(fixture: {
  establishmentId: string;
  productId: string;
}) {
  await withDb(async (client) => {
    await client.query("delete from public.reviews where product_id = $1", [
      fixture.productId,
    ]);
    await client.query("delete from public.products where id = $1", [
      fixture.productId,
    ]);
    await client.query("delete from public.establishments where id = $1", [
      fixture.establishmentId,
    ]);
  });
}

test.describe("reseñas", () => {
  test.beforeEach(() => {
    test.slow();
  });

  test("crear, editar y publicar insignia de reseña verificada", async ({
    page,
    browserName,
  }) => {
    const email = `e2e.review.${browserName}.${randomUUID()}@uptc.edu.co`;
    let userId = "";
    const reviewIds: string[] = [];
    const fixture = await createProductFixture();

    try {
      userId = await createUserViaApi(email);
      await login(page, email);

      await page.goto(`/producto/${fixture.productId}`);
      await expect(
        page.getByRole("heading", { name: "Escribe tu reseña" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Publicar reseña" }),
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

      await page.locator("#comment").fill("Reseña E2E rica");
      await expect(page.locator('input[name="clientId"]')).not.toHaveValue("");
      const clientId = await page
        .locator('input[name="clientId"]')
        .inputValue();

      await page.getByRole("button", { name: "Publicar reseña" }).click();
      await expect(page.getByRole("status")).toContainText("publicada");

      await page.waitForTimeout(1200);
      await expect(
        page.getByRole("list").getByText("Reseña E2E rica"),
      ).toBeVisible();
      await expect(page.getByText("Reseña verificada").first()).toBeVisible();

      const created = await withDb(async (client) => {
        const result = await client.query<{ id: string; client_id: string }>(
          "select id, client_id from public.reviews where product_id = $1 and user_id = $2",
          [fixture.productId, userId],
        );
        return result.rows;
      });
      expect(created).toHaveLength(1);
      expect(created[0]?.client_id).toBe(clientId);
      if (created[0]) reviewIds.push(created[0].id);

      await expect(
        page.getByRole("heading", { name: "Edita tu reseña" }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Edita tu reseña" }),
      ).toBeVisible();
      await page.locator("#comment").fill("Reseña E2E editada");
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await expect(page.getByRole("status")).toContainText("actualizada");

      await page.waitForTimeout(1200);
      await expect(
        page.getByRole("list").getByText("Reseña E2E editada"),
      ).toBeVisible();

      const updated = await withDb(async (client) => {
        const result = await client.query<{ comment: string }>(
          "select comment from public.reviews where id = $1",
          [reviewIds[0]],
        );
        return result.rows[0]?.comment;
      });
      expect(updated).toBe("Reseña E2E editada");
    } finally {
      await deleteReviewsAndUsers(reviewIds, [userId].filter(Boolean));
      await deleteProductFixture(fixture);
    }
  });

  test("reportar una reseña ajena, duplicado y propia sin botón", async ({
    page,
    browserName,
  }) => {
    const suffix = randomUUID();
    const ownerEmail = `e2e.report.owner.${browserName}.${suffix}@uptc.edu.co`;
    const otherEmail = `e2e.report.other.${browserName}.${suffix}@uptc.edu.co`;
    const ownReviewId = randomUUID();
    const otherReviewId = randomUUID();
    let ownerId = "";
    let otherId = "";
    const fixture = await createProductFixture();

    try {
      ownerId = await createUserViaApi(ownerEmail);
      otherId = await createUserViaApi(otherEmail);

      await withDb(async (client) => {
        await client.query(
          `insert into public.reviews
             (id, client_id, user_id, product_id, establishment_id,
              rating_sabor, rating_cantidad, rating_precio,
              rating_presentacion, rating_calidad_precio, comment)
           values
             ($1, $2, $3, $4, $5, 4, 4, 4, 4, 4, 'Propia'),
             ($6, $7, $8, $4, $5, 3, 3, 3, 3, 3, 'Ajena')`,
          [
            ownReviewId,
            randomUUID(),
            ownerId,
            fixture.productId,
            fixture.establishmentId,
            otherReviewId,
            randomUUID(),
            otherId,
          ],
        );
      });

      await login(page, ownerEmail);
      await page.goto(`/producto/${fixture.productId}`);

      await expect(
        page.getByRole("list").getByText("Propia", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("list").getByText("Ajena", { exact: true }),
      ).toBeVisible();

      const reportButtons = page.getByRole("button", { name: "Reportar" });
      await expect(reportButtons).toHaveCount(1);

      await reportButtons.click();
      await page.getByLabel("Motivo del reporte").fill("Contenido ofensivo");
      await page.getByRole("button", { name: "Enviar reporte" }).click();
      await expect(page.getByRole("status")).toContainText("Reporte enviado");

      await page.getByRole("button", { name: "Enviar reporte" }).click();
      await expect(page.getByRole("status")).toContainText(
        "Ya reportaste esta reseña",
      );

      const reports = await withDb(async (client) => {
        const result = await client.query<{ count: number }>(
          "select count(*)::int as count from public.review_reports where review_id = $1",
          [otherReviewId],
        );
        return result.rows[0]?.count;
      });
      expect(reports).toBe(1);
    } finally {
      await deleteReviewsAndUsers(
        [ownReviewId, otherReviewId],
        [ownerId, otherId].filter(Boolean),
      );
      await deleteProductFixture(fixture);
    }
  });

  test("un no estudiante no ve el formulario", async ({ page }) => {
    await page.goto(`/producto/${PRODUCT_ID}`);

    await expect(
      page.getByRole("link", { name: "Entra con tu correo UPTC" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publicar reseña" }),
    ).toHaveCount(0);
  });

  test("guardar un favorito online y recuperar el estado del servidor", async ({
    page,
    browserName,
  }) => {
    const email = `e2e.favorite.${browserName}.${randomUUID()}@uptc.edu.co`;
    const fixture = await createProductFixture();
    let userId = "";

    try {
      userId = await createUserViaApi(email);
      await login(page, email);
      await page.goto(`/producto/${fixture.productId}`);

      await page.getByRole("button", { name: "Guardar", exact: true }).click();
      await expect(page.getByText("Guardado.")).toBeVisible();

      await expect
        .poll(() =>
          withDb(async (client) => {
            const result = await client.query<{ count: number }>(
              "select count(*)::int as count from public.favorites where user_id = $1 and product_id = $2",
              [userId, fixture.productId],
            );
            return result.rows[0]?.count ?? 0;
          }),
        )
        .toBe(1);

      await page.reload();
      await expect(
        page.getByRole("button", { name: "Quitar de guardados" }),
      ).toBeVisible();
    } finally {
      await deleteReviewsAndUsers([], [userId].filter(Boolean));
      await deleteProductFixture(fixture);
    }
  });

  test("un admin autenticado tampoco puede reseñar", async ({
    page,
    browserName,
  }) => {
    const email = `e2e.review.admin.${browserName}.${randomUUID()}@uptc.edu.co`;
    let userId = "";

    try {
      userId = await createUserViaApi(email);
      await withDb(async (client) => {
        await client.query(
          "update public.profiles set role = 'admin' where id = $1",
          [userId],
        );
      });

      await login(page, email);
      await page.goto(`/producto/${PRODUCT_ID}`);

      await expect(
        page.getByText("Solo estudiantes institucionales de la UPTC"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Publicar reseña" }),
      ).toHaveCount(0);
    } finally {
      await deleteReviewsAndUsers([], [userId].filter(Boolean));
    }
  });
});
