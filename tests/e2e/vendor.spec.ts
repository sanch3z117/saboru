import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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
    page.getByRole("button", { name: /Salir|Cerrar sesión/ }),
  ).toBeVisible();
}

type Fixture = {
  email: string;
  userId: string;
  establishmentId: string;
  productId: string;
  slug: string;
};

async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const input = document.querySelector("#description");
    return (
      Boolean(input) &&
      Object.keys(input as HTMLElement).some((key) =>
        key.startsWith("__reactFiber$"),
      )
    );
  });
}

/** Espera la recarga que dispara el formulario (y la hidratación posterior). */
async function submitForm(page: Page, click: () => Promise<void>) {
  const loaded = page
    .waitForEvent("load", { timeout: 15_000 })
    .catch(() => undefined);
  await click();
  await loaded;
  await waitForHydration(page);
}

async function createVendorFixture(options: {
  status?: "active" | "suspended";
  reviews?: number;
} = {}): Promise<Fixture> {
  const suffix = randomUUID();
  const email = `e2e.vendor.${suffix}@uptc.edu.co`;
  const userId = await createUserViaApi(email);
  const establishmentId = randomUUID();
  const productId = randomUUID();
  const slug = `panel-${suffix}`;

  await withDb(async (client) => {
    await client.query(
      "update public.profiles set role = 'vendor' where id = $1",
      [userId],
    );
    await client.query(
      `insert into public.establishments
         (id, owner_id, name, slug, description, address, location, category, status)
       values ($1, $2, $3, $4, 'Comida de prueba', 'Bloque Central',
               extensions.st_point(-73.3567, 5.552)::extensions.geography,
               'almuerzo', 'active')`,
      [
        establishmentId,
        userId,
        `Local E2E ${suffix.slice(0, 8)}`,
        slug,
      ],
    );
    await client.query(
      `insert into public.products
         (id, establishment_id, name, price_cop, category, available)
       values ($1, $2, 'Producto inicial', 8000, 'almuerzo', true)`,
      [productId, establishmentId],
    );

    for (let index = 0; index < (options.reviews ?? 0); index += 1) {
      const studentEmail = `e2e.vendor.student.${index}.${suffix}@uptc.edu.co`;
      const studentId = await createUserViaApi(studentEmail);
      await client.query(
        `insert into public.reviews
           (client_id, user_id, product_id, establishment_id,
            rating_sabor, rating_cantidad, rating_precio,
            rating_presentacion, rating_calidad_precio, comment)
         values (gen_random_uuid(), $1, $2, $3, 4, 4, 4, 4, 4, $4)`,
        [studentId, productId, establishmentId, `Comentario E2E ${index}`],
      );
    }

    if (options.status && options.status !== "active") {
      await client.query(
        "update public.establishments set status = $1::public.establishment_status where id = $2",
        [options.status, establishmentId],
      );
    }
  });

  return { email, userId, establishmentId, productId, slug };
}

async function deleteFixture(fixture: Fixture) {
  const studentIds = await withDb(async (client) => {
    const result = await client.query<{ user_id: string }>(
      "select distinct user_id from public.reviews where establishment_id = $1",
      [fixture.establishmentId],
    );
    return result.rows.map((row) => row.user_id);
  });

  await withDb(async (client) => {
    await client.query(
      "select set_config('storage.allow_delete_query', 'true', false)",
    );
    await client.query(
      "delete from storage.objects where bucket_id = 'establishment-photos' and name like $1",
      [`${fixture.establishmentId}/%`],
    );
    await client.query("delete from public.reviews where establishment_id = $1", [
      fixture.establishmentId,
    ]);
    await client.query("delete from public.products where establishment_id = $1", [
      fixture.establishmentId,
    ]);
    await client.query("delete from public.establishments where id = $1", [
      fixture.establishmentId,
    ]);
    if (studentIds.length > 0) {
      await client.query("delete from auth.users where id = any($1::uuid[])", [
        studentIds,
      ]);
    }
    await client.query("delete from auth.users where id = $1", [
      fixture.userId,
    ]);
  });
}

test.describe("panel del vendedor", () => {
  test.beforeEach(() => {
    test.slow();
  });

  test("edita la ficha, gestiona productos y fotos", async ({ page }) => {
    const fixture = await createVendorFixture();

    try {
      await login(page, fixture.email);
      await page.goto("/panel");
      await waitForHydration(page);
      await expect(
        page.getByRole("heading", { level: 1 }),
      ).toContainText("Local E2E");
      await expect(page.getByText("Publicado en el catálogo")).toBeVisible();
      await expect(page.getByText("Sin fotos todavía")).toBeVisible();

      const description = `Descripción editada ${randomUUID().slice(0, 8)}`;
      await page.locator("#description").fill(description);
      await submitForm(page, () =>
        page.getByRole("button", { name: "Guardar ficha" }).click(),
      );

      await expect
        .poll(
          async () =>
            withDb(async (client) => {
              const result = await client.query<{ description: string }>(
                "select description from public.establishments where id = $1",
                [fixture.establishmentId],
              );
              return result.rows[0]?.description;
            }),
          { timeout: 15_000 },
        )
        .toBe(description);

      await page.locator("#name-new").fill("Almuerzo E2E");
      await page.locator("#price-new").fill("9000");
      await page.locator("#category-new").fill("almuerzo");
      await submitForm(page, () =>
        page.getByRole("button", { name: "Agregar producto" }).click(),
      );

      await expect
        .poll(
          async () =>
            withDb(async (client) => {
              const result = await client.query<{ count: string }>(
                "select count(*)::text as count from public.products where establishment_id = $1",
                [fixture.establishmentId],
              );
              return Number(result.rows[0]?.count ?? 0);
            }),
          { timeout: 15_000 },
        )
        .toBe(2);

      await expect(
        page.getByRole("listitem").filter({ hasText: "Almuerzo E2E" }).first(),
      ).toBeVisible();

      await page.getByRole("button", { name: "Editar" }).first().click();
      await page.locator('input[name="price_cop"]').first().fill("9500");
      await submitForm(page, () =>
        page.getByRole("button", { name: "Guardar cambios" }).click(),
      );

      await expect
        .poll(
          async () =>
            withDb(async (client) => {
              const result = await client.query<{ price_cop: number }>(
                "select price_cop from public.products where establishment_id = $1",
                [fixture.establishmentId],
              );
              return result.rows.map((row) => row.price_cop);
            }),
          { timeout: 15_000 },
        )
        .toContain(9500);

      await submitForm(page, () =>
        page.getByRole("button", { name: "Eliminar" }).last().click(),
      );

      await expect
        .poll(
          async () =>
            withDb(async (client) => {
              const result = await client.query<{ count: string }>(
                "select count(*)::text as count from public.products where establishment_id = $1",
                [fixture.establishmentId],
              );
              return Number(result.rows[0]?.count ?? 0);
            }),
          { timeout: 15_000 },
        )
        .toBe(1);

      await page.locator('input[name="file"]').setInputFiles({
        name: "foto.png",
        mimeType: "image/png",
        buffer: PNG_1X1,
      });
      await submitForm(page, () =>
        page.getByRole("button", { name: "Subir foto" }).click(),
      );

      await expect
        .poll(
          async () =>
            withDb(async (client) => {
              const result = await client.query<{ photos: string[] }>(
                "select photos from public.establishments where id = $1",
                [fixture.establishmentId],
              );
              return result.rows[0]?.photos ?? [];
            }),
          { timeout: 15_000 },
        )
        .toHaveLength(1);

      const stored = await withDb(async (client) => {
        const result = await client.query<{ photos: string[] }>(
          "select photos from public.establishments where id = $1",
          [fixture.establishmentId],
        );
        return result.rows[0]?.photos ?? [];
      });
      expect(stored[0]).toMatch(
        new RegExp(`^${fixture.establishmentId}/[0-9a-f-]{36}\\.png$`),
      );
      await expect(
        page.getByRole("img", { name: "Foto 1 de tu local" }),
      ).toBeVisible();

      await submitForm(page, () =>
        page.getByRole("button", { name: "Eliminar foto" }).click(),
      );

      await expect
        .poll(
          async () =>
            withDb(async (client) => {
              const result = await client.query<{ photos: string[] }>(
                "select photos from public.establishments where id = $1",
                [fixture.establishmentId],
              );
              return result.rows[0]?.photos ?? [];
            }),
          { timeout: 15_000 },
        )
        .toHaveLength(0);

      await expect(page.getByText("Sin fotos todavía")).toBeVisible();

      await expect(
        page.getByText("Necesitas al menos 5 reseñas publicadas"),
      ).toBeVisible();
    } finally {
      await deleteFixture(fixture);
    }
  });

  test("ve estadísticas agregadas y el estado de suspensión", async ({
    page,
  }) => {
    const fixture = await createVendorFixture({
      reviews: 5,
      status: "suspended",
    });

    try {
      await login(page, fixture.email);
      await page.goto("/panel");

      await expect(
        page.getByText("Suspendido: no aparece en el catálogo"),
      ).toBeVisible();
      await expect(page.getByText("Tu local frente al campus")).toBeVisible();
      await expect(page.getByText("Con 5 reseñas")).toBeVisible();
      await expect(
        page.getByText(
          "El campus todavía no tiene reseñas suficientes para comparar.",
        ),
      ).toBeVisible();
      await expect(page.getByText("Producto inicial").first()).toBeVisible();
      await expect(page.getByText("Comentario E2E 0")).toBeVisible();
      await expect(page.getByText("Sin autor: solo el comentario")).toBeVisible();
      await expect(page.getByText("e2e.vendor.student")).toHaveCount(0);
    } finally {
      await deleteFixture(fixture);
    }
  });

  test("un vendedor no ve ni edita el local de otro", async ({ page }) => {
    const other = await createVendorFixture();
    const owner = await createVendorFixture();

    try {
      await login(page, other.email);
      await page.goto("/panel");

      await expect(
        page.getByRole("heading", { level: 1 }),
      ).toContainText("Local E2E");
      await expect(
        page.getByText(owner.establishmentId, { exact: false }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("listitem").filter({ hasText: "Producto inicial" }),
      ).toHaveCount(1);

      const foreign = await withDb(async (client) => {
        const result = await client.query<{ description: string }>(
          "select description from public.establishments where id = $1",
          [owner.establishmentId],
        );
        return result.rows[0]?.description;
      });
      expect(foreign).toBe("Comida de prueba");
    } finally {
      await deleteFixture(other);
      await deleteFixture(owner);
    }
  });

  test("un estudiante no entra al panel", async ({ page }) => {
    const email = `e2e.vendor.studentonly.${randomUUID()}@uptc.edu.co`;
    let userId = "";

    try {
      userId = await createUserViaApi(email);
      await login(page, email);
      await page.goto("/panel");
      await expect(page).toHaveURL(/\/($|\?)/);
      await expect(
        page.getByRole("heading", { name: "Panel del vendedor" }),
      ).toHaveCount(0);
    } finally {
      if (userId) {
        await withDb(async (client) => {
          await client.query("delete from auth.users where id = $1", [userId]);
        });
      }
    }
  });
});
