import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const SEED_PRODUCT = "20000000-0000-4000-8000-000000000001";
const SEED_ESTABLISHMENT = "10000000-0000-4000-8000-000000000001";

test.describe.configure({ mode: "serial" });

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

async function withDb<T>(fn: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function createConfirmedUserViaApi(email: string) {
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

async function promoteToAdmin(id: string) {
  await withDb((client) =>
    client.query("update public.profiles set role = 'admin' where id = $1", [
      id,
    ]),
  );
}

async function deleteAuthUsers(ids: string[]) {
  if (ids.length === 0) return;
  await withDb((client) =>
    client.query("delete from auth.users where id = any($1::uuid[])", [ids]),
  );
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

async function expectAdminNotice(page: Page, text: string) {
  await expect(
    page.getByRole("heading", { name: "Moderación y locales" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(text)).toBeVisible({ timeout: 20_000 });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Revisa tu correo");
  await page.goto(await getMagicLink(email));
}

async function insertFixtureEstablishment(name: string, slug: string) {
  return withDb(async (client) => {
    const result = await client.query<{ id: string }>(
      `insert into public.establishments
         (name, slug, description, address, location, schedule, category, status, plan)
       values ($1, $2, 'Fixture de admin', 'Bloque Central',
               extensions.st_point(-73.3567, 5.552)::extensions.geography,
               '{}'::jsonb, 'almuerzos', 'active', 'basic')
       returning id`,
      [name, slug],
    );
    return result.rows[0]?.id ?? "";
  });
}

async function insertReview(userId: string, comment: string) {
  const id = randomUUID();
  await withDb((client) =>
    client.query(
      `insert into public.reviews
         (id, client_id, user_id, product_id, establishment_id,
          rating_sabor, rating_cantidad, rating_precio,
          rating_presentacion, rating_calidad_precio, comment)
       values ($1, $2, $3, $4, $5, 5, 4, 4, 5, 4, $6)`,
      [id, randomUUID(), userId, SEED_PRODUCT, SEED_ESTABLISHMENT, comment],
    ),
  );
  return id;
}

async function insertReport(
  reporterId: string,
  reviewId: string,
  reason: string,
) {
  const id = randomUUID();
  await withDb((client) =>
    client.query(
      `insert into public.review_reports
         (id, client_id, review_id, reporter_id, reason)
       values ($1, $2, $3, $4, $5)`,
      [id, randomUUID(), reviewId, reporterId, reason],
    ),
  );
  return id;
}

async function cleanup(ids: {
  users: string[];
  establishments: string[];
  reviews: string[];
}) {
  await withDb(async (client) => {
    if (ids.establishments.length > 0) {
      await client.query(
        "delete from public.vendor_invites where establishment_id = any($1::uuid[])",
        [ids.establishments],
      );
    }
    if (ids.reviews.length > 0) {
      await client.query(
        "delete from public.reviews where id = any($1::uuid[])",
        [ids.reviews],
      );
    }
  });
  await deleteAuthUsers(ids.users);
  await withDb(async (client) => {
    if (ids.establishments.length > 0) {
      await client.query(
        "delete from public.products where establishment_id = any($1::uuid[])",
        [ids.establishments],
      );
      await client.query(
        "delete from public.establishments where id = any($1::uuid[])",
        [ids.establishments],
      );
    }
  });
}

test("modera, gestiona locales, crea uno e invita", async ({ page }) => {
  test.slow();

  const suffix = randomUUID();
  const adminEmail = `e2e.admin.${suffix}@uptc.edu.co`;
  const studentEmail = `e2e.admin.student.${suffix}@uptc.edu.co`;
  const fixtureName = `Local Admin ${suffix.slice(0, 8)}`;
  const fixtureSlug = `admin-fixture-${suffix}`;
  const reviewComment = `Reseña para moderar ${suffix.slice(0, 8)}`;
  const reportReason = `Spam ${suffix.slice(0, 8)}`;
  const newName = `Local Nuevo ${suffix.slice(0, 8)}`;
  const newSlug = `local-nuevo-${suffix}`;
  const inviteEmail = `vendedor.${suffix}@example.com`;
  const userIds: string[] = [];
  const establishmentIds: string[] = [];
  const reviewIds: string[] = [];

  try {
    const adminId = await createConfirmedUserViaApi(adminEmail);
    userIds.push(adminId);
    await promoteToAdmin(adminId);

    const studentId = await createConfirmedUserViaApi(studentEmail);
    userIds.push(studentId);

    const fixtureId = await insertFixtureEstablishment(
      fixtureName,
      fixtureSlug,
    );
    establishmentIds.push(fixtureId);

    const reviewId = await insertReview(studentId, reviewComment);
    reviewIds.push(reviewId);

    await login(page, adminEmail);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: "Moderación y locales" }),
    ).toBeVisible();
    const adminNavigation = page.getByRole("navigation", {
      name: "Navegación de administración",
    });
    await expect(
      adminNavigation.getByRole("link", { name: /reportes/i }),
    ).toBeVisible();
    await expect(
      adminNavigation.getByRole("link", { name: /reseñas/i }),
    ).toBeVisible();
    await expect(
      adminNavigation.getByRole("link", { name: /locales/i }),
    ).toBeVisible();
    await expect(
      adminNavigation.getByRole("link", { name: /crear local/i }),
    ).toBeVisible();
    await expect(
      adminNavigation.getByRole("link", { name: /invitaciones/i }),
    ).toBeVisible();

    // Reporte creado después de la primera carga.
    const reportId = await insertReport(studentId, reviewId, reportReason);
    await page.reload();

    const reportsSection = page.locator(
      'section[aria-labelledby="reportes-heading"]',
    );
    const reportRow = reportsSection
      .getByRole("listitem")
      .filter({ hasText: reportReason });
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole("button", { name: "Marcar revisado" }).click();
    await expectAdminNotice(page, "Reporte marcado como revisado.");

    await expect
      .poll(() =>
        withDb(async (client) => {
          const result = await client.query<{ status: string }>(
            "select status from public.review_reports where id = $1",
            [reportId],
          );
          return result.rows[0]?.status;
        }),
      )
      .toBe("reviewed");

    // Moderación de la reseña: ocultar y volver a publicar.
    const reviewsSection = page.locator(
      'section[aria-labelledby="resenas-heading"]',
    );
    const reviewRow = reviewsSection
      .getByRole("listitem")
      .filter({ hasText: reviewComment });
    await expect(reviewRow).toBeVisible();
    await reviewRow.getByRole("button", { name: "Ocultar reseña" }).click();
    await expectAdminNotice(page, "Reseña oculta del catálogo.");
    await expect
      .poll(() =>
        withDb(async (client) => {
          const result = await client.query<{ status: string }>(
            "select status from public.reviews where id = $1",
            [reviewId],
          );
          return result.rows[0]?.status;
        }),
      )
      .toBe("hidden");

    await page.reload();
    const hiddenRow = page
      .locator('section[aria-labelledby="resenas-heading"]')
      .getByRole("listitem")
      .filter({ hasText: reviewComment });
    await expect(hiddenRow.getByText("Oculta")).toBeVisible();
    await hiddenRow.getByRole("button", { name: "Publicar reseña" }).click();
    await expectAdminNotice(page, "Reseña publicada de nuevo.");

    // Estado y plan del local.
    const establishmentRow = page
      .getByRole("listitem")
      .filter({ hasText: fixtureName });
    await expect(establishmentRow).toBeVisible();
    await establishmentRow.getByRole("button", { name: "Suspender" }).click();
    await expectAdminNotice(
      page,
      "Local suspendido: ya no aparece en el catálogo.",
    );
    await expect
      .poll(() =>
        withDb(async (client) => {
          const result = await client.query<{ status: string }>(
            "select status from public.establishments where slug = $1",
            [fixtureSlug],
          );
          return result.rows[0]?.status;
        }),
      )
      .toBe("suspended");

    await page.reload();
    const suspendedRow = page
      .getByRole("listitem")
      .filter({ hasText: fixtureName });
    await suspendedRow.getByRole("button", { name: "Reactivar" }).click();
    await expectAdminNotice(page, "Local aprobado y visible en el catálogo.");

    await page.reload();
    const planRow = page.getByRole("listitem").filter({ hasText: fixtureName });
    await planRow.getByLabel(`Plan de ${fixtureName}`).selectOption("pro");
    await planRow.getByRole("button", { name: "Guardar plan" }).click();
    await expectAdminNotice(page, "Plan actualizado.");
    await expect
      .poll(() =>
        withDb(async (client) => {
          const result = await client.query<{ plan: string }>(
            "select plan from public.establishments where slug = $1",
            [fixtureSlug],
          );
          return result.rows[0]?.plan;
        }),
      )
      .toBe("pro");

    // Crear un local en borrador y aprobarlo.
    await page.reload();
    await page.getByLabel("Nombre del local").fill(newName);
    await page.getByLabel("Slug de la URL").fill(newSlug);
    await page.getByLabel("Categoría").fill("panadería");
    await page.getByLabel("Dirección o referencia").fill("Bloque Central");
    await page.getByText("Horario semanal (opcional)").click();
    await page.getByLabel("Lunes abre", { exact: true }).fill("08:00");
    await page.getByLabel("Lunes cierra", { exact: true }).fill("17:00");
    await page.getByRole("button", { name: "Crear local" }).click();
    await expectAdminNotice(
      page,
      "Local creado como borrador. Apruébalo cuando esté listo.",
    );

    const createdStatus = await withDb(async (client) => {
      const result = await client.query<{ status: string }>(
        "select status from public.establishments where slug = $1",
        [newSlug],
      );
      return result.rows[0]?.status;
    });
    expect(createdStatus).toBe("draft");

    await page.reload();
    const newRow = page.getByRole("listitem").filter({ hasText: newName });
    await expect(newRow).toBeVisible();
    await newRow.getByRole("button", { name: "Aprobar local" }).click();
    await expectAdminNotice(page, "Local aprobado y visible en el catálogo.");

    const newEstablishmentId = await withDb(async (client) => {
      const result = await client.query<{ id: string }>(
        "select id from public.establishments where slug = $1",
        [newSlug],
      );
      return result.rows[0]?.id ?? "";
    });
    establishmentIds.push(newEstablishmentId);

    // Invitación para el local nuevo, todavía sin dueño.
    await page.getByLabel("Correo del vendedor").fill(inviteEmail);
    await page.getByLabel("Local sin dueño").selectOption({ label: newName });
    await page.getByRole("button", { name: "Crear invitación" }).click();
    await expectAdminNotice(page, "Invitación creada.");

    await expect
      .poll(() =>
        withDb(async (client) => {
          const result = await client.query<{ email: string }>(
            "select email from public.vendor_invites where establishment_id = $1",
            [newEstablishmentId],
          );
          return result.rows[0]?.email;
        }),
      )
      .toBe(inviteEmail);

    // Estado de error: slug duplicado.
    await page.getByLabel("Nombre del local").fill(`Duplicado ${suffix}`);
    await page.getByLabel("Slug de la URL").fill(fixtureSlug);
    await page.getByLabel("Categoría").fill("almuerzos");
    await page.getByRole("button", { name: "Crear local" }).click();
    await expect(
      page.getByText("Ya existe un local con ese slug. Prueba con otro."),
    ).toBeVisible();

    // Sin desbordamiento horizontal en el perfil móvil.
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  } finally {
    await cleanup({
      users: userIds,
      establishments: establishmentIds.filter(Boolean),
      reviews: reviewIds,
    });
  }
});

test("un estudiante no entra a /admin", async ({ page }) => {
  const suffix = randomUUID();
  const email = `e2e.admin.denied.${suffix}@uptc.edu.co`;
  let userId = "";

  try {
    userId = await createConfirmedUserViaApi(email);
    await login(page, email);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/($|\?)/);
    await expect(
      page.getByRole("heading", { name: "Moderación y locales" }),
    ).toHaveCount(0);
  } finally {
    await deleteAuthUsers([userId].filter(Boolean));
  }
});
