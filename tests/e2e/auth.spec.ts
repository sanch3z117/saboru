import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

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

type MailpitMessage = {
  ID: string;
  To: { Address: string }[];
};

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

async function createAuthUser(email: string) {
  const id = randomUUID();
  await withDb((client) =>
    client.query(
      `insert into auth.users (id, email, email_confirmed_at)
       values ($1, $2, now())`,
      [id, email],
    ),
  );
  return id;
}

/**
 * Crea el usuario por la API de Auth para que GoTrue le asigne identidad;
 * así `shouldCreateUser: false` del login lo reconoce.
 */
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

async function getMagicLink(email: string, skipMessageId?: string) {
  let result = { link: "", messageId: "" };

  await expect
    .poll(
      async () => {
        const response = await fetch(`${MAILPIT_URL}/api/v1/messages`);
        if (!response.ok) return "";
        const data = (await response.json()) as MailpitList;
        const message = data.messages.find(
          (item) =>
            item.ID !== skipMessageId &&
            item.To.some((to) => to.Address === email),
        );
        if (!message) return "";

        const fullResponse = await fetch(
          `${MAILPIT_URL}/api/v1/message/${message.ID}`,
        );
        if (!fullResponse.ok) return "";
        const full = (await fullResponse.json()) as MailpitFull;
        const body = full.Text || full.HTML || "";
        const link =
          body.match(
            /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/,
          )?.[0] ?? "";
        result = { link, messageId: message.ID };
        return link;
      },
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe("");

  return result;
}

async function submitMagicLink(
  page: Page,
  path: string,
  email: string,
  button: string,
) {
  await page.goto(path);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: button }).click();
  await expect(page.getByRole("status")).toContainText("Revisa tu correo");
}

test.describe("autenticación", () => {
  test("registro institucional, enlace mágico, sesión y cierre", async ({
    page,
    browserName,
  }) => {
    const suffix = randomUUID();
    const email = `e2e.estudiante.${browserName}.${suffix}@uptc.edu.co`;

    try {
      await submitMagicLink(page, "/registro", email, "Crear cuenta");

      const { link } = await getMagicLink(email);
      await page.goto(link);

      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();

      const role = await withDb(async (client) => {
        const result = await client.query<{ role: string }>(
          "select role from public.profiles where email = $1",
          [email],
        );
        return result.rows[0]?.role;
      });
      expect(role).toBe("student");

      await page.getByRole("button", { name: "Salir" }).click();
      await expect(page).toHaveURL(/\/login$/);

      await page.goto("/panel");
      await expect(page).toHaveURL(/\/login$/);
    } finally {
      const ids = await withDb(async (client) => {
        const result = await client.query<{ id: string }>(
          "select id from auth.users where email = $1",
          [email],
        );
        return result.rows.map((row) => row.id);
      });
      await deleteAuthUsers(ids);
    }
  });

  test("rechaza un correo no institucional en el registro", async ({
    page,
    browserName,
  }) => {
    const email = `e2e.ajeno.${browserName}.${randomUUID()}@gmail.com`;

    await page.goto("/registro");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.locator("p[role='alert']")).toContainText(
      /institucional/i,
    );

    const count = await withDb(async (client) => {
      const result = await client.query<{ count: number }>(
        "select count(*)::int as count from auth.users where email = $1",
        [email],
      );
      return result.rows[0]?.count;
    });
    expect(count).toBe(0);
  });

  test("un usuario existente entra desde /login", async ({
    page,
    browserName,
  }) => {
    const email = `e2e.login.${browserName}.${randomUUID()}@uptc.edu.co`;
    let userId = "";

    try {
      userId = await createConfirmedUserViaApi(email);

      await submitMagicLink(page, "/login", email, "Enviar enlace");
      const { link } = await getMagicLink(email);
      await page.goto(link);

      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();

      const role = await withDb(async (client) => {
        const result = await client.query<{ role: string }>(
          "select role from public.profiles where email = $1",
          [email],
        );
        return result.rows[0]?.role;
      });
      expect(role).toBe("student");
    } finally {
      await deleteAuthUsers([userId].filter(Boolean));
    }
  });

  test("vendedor con invitación entra al panel", async ({
    page,
    browserName,
  }) => {
    const suffix = randomUUID();
    const vendorEmail = `e2e.vendor.${browserName}.${suffix}@example.com`;
    const adminEmail = `e2e.admin.${browserName}.${suffix}@uptc.edu.co`;
    const establishmentId = randomUUID();
    let adminId = "";

    try {
      adminId = await createAuthUser(adminEmail);
      await promoteToAdmin(adminId);

      await withDb(async (client) => {
        await client.query(
          `insert into public.establishments
             (id, name, slug, location, status)
           values ($1, $2, $3, extensions.st_point(-73.3567, 5.552)::extensions.geography, 'active')`,
          [establishmentId, `E2E ${suffix}`, `e2e-${suffix}`],
        );
        await client.query(
          `insert into public.vendor_invites (email, establishment_id, invited_by)
           values ($1, $2, $3)`,
          [vendorEmail, establishmentId, adminId],
        );
      });

      await submitMagicLink(
        page,
        "/registro/vendedor",
        vendorEmail,
        "Aceptar invitación",
      );

      const { link } = await getMagicLink(vendorEmail);
      await page.goto(link);

      await expect(page).toHaveURL(/\/panel$/);
      await expect(
        page.getByRole("heading", { name: "Panel del vendedor" }),
      ).toBeVisible();

      const state = await withDb(async (client) => {
        const profile = await client.query<{ id: string; role: string }>(
          "select id, role from public.profiles where email = $1",
          [vendorEmail],
        );
        const invite = await client.query<{ accepted_by: string | null }>(
          "select accepted_by from public.vendor_invites where email = $1",
          [vendorEmail],
        );
        const establishment = await client.query<{ owner_id: string | null }>(
          "select owner_id from public.establishments where id = $1",
          [establishmentId],
        );
        return {
          role: profile.rows[0]?.role,
          acceptedBy: invite.rows[0]?.accepted_by,
          ownerId: establishment.rows[0]?.owner_id,
        };
      });

      expect(state.role).toBe("vendor");
      expect(state.acceptedBy).toBeTruthy();
      expect(state.ownerId).toBe(state.acceptedBy);
    } finally {
      await withDb(async (client) => {
        await client.query(
          "update public.establishments set owner_id = null where id = $1",
          [establishmentId],
        );
        await client.query(
          "delete from public.vendor_invites where establishment_id = $1",
          [establishmentId],
        );
        await client.query("delete from public.establishments where id = $1", [
          establishmentId,
        ]);
      });
      const ids = await withDb(async (client) => {
        const result = await client.query<{ id: string }>(
          "select id from auth.users where email = any($1::text[])",
          [[vendorEmail, adminEmail]],
        );
        return result.rows.map((row) => row.id);
      });
      await deleteAuthUsers([...ids, adminId].filter(Boolean));
    }
  });

  test("vendedor sin invitación ve un error claro", async ({
    page,
    browserName,
  }) => {
    const email = `e2e.sin-invitacion.${browserName}.${randomUUID()}@example.com`;

    await page.goto("/registro/vendedor");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("button", { name: "Aceptar invitación" }).click();

    await expect(page.locator("p[role='alert']")).toContainText(/invitación/i);
  });

  test("un admin es redirigido a /admin tras el enlace", async ({
    page,
    browserName,
  }) => {
    const email = `e2e.admin-login.${browserName}.${randomUUID()}@uptc.edu.co`;
    let adminId = "";

    try {
      await submitMagicLink(page, "/registro", email, "Crear cuenta");
      const magic = await getMagicLink(email);

      adminId = await withDb(async (client) => {
        const result = await client.query<{ id: string }>(
          "select id from auth.users where email = $1",
          [email],
        );
        return result.rows[0]?.id ?? "";
      });
      await promoteToAdmin(adminId);

      await page.goto(magic.link);

      await expect(page).toHaveURL(/\/admin$/);
      await expect(
        page.getByRole("heading", { name: "Administración" }),
      ).toBeVisible();
    } finally {
      await deleteAuthUsers([adminId].filter(Boolean));
    }
  });
});
