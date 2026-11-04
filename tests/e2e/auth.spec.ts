import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

import { PRIVACY_VERSION } from "../../src/lib/auth/privacy";

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
  const consent = page.getByRole("checkbox", {
    name: /política de privacidad/i,
  });
  if ((await consent.count()) > 0) {
    await consent.check();
  }
  await page.getByRole("button", { name: button }).click();
  await expect(page.getByRole("status")).toContainText("Revisa tu correo");
}

async function seedLocalUserData(page: Page, userId: string) {
  await page.evaluate(async (sessionUserId) => {
    const request = indexedDB.open("saboru-offline", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("snapshot")) {
        db.createObjectStore("snapshot", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "clientId" });
      }
      if (!db.objectStoreNames.contains("favorites")) {
        db.createObjectStore("favorites", { keyPath: "id" });
      }
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ["snapshot", "outbox", "favorites"],
        "readwrite",
      );
      tx.objectStore("snapshot").put({
        id: "catalog",
        snapshot: {
          version: "v1",
          generated_at: "2026-11-03T00:00:00.000Z",
          blocks: [],
          establishments: [],
          products: [],
          product_stats: [],
          reviews: [],
        },
        savedAt: 1,
      });
      tx.objectStore("outbox").put({
        clientId: "pending-1",
        userId: sessionUserId,
        type: "review",
        payload: {},
        status: "pending",
        attempts: 0,
        createdAt: 1,
      });
      tx.objectStore("favorites").put({
        id: "favorite-1",
        userId: sessionUserId,
        establishmentId: "e1",
        productId: null,
        createdAt: 1,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    const cache = await caches.open("pages");
    await cache.put("/producto/privado", new Response("privado"));

    localStorage.setItem(
      "saboru:viewer",
      JSON.stringify({
        userId: sessionUserId,
        email: "u1@uptc.edu.co",
        role: "student",
        canReview: true,
      }),
    );
    sessionStorage.setItem("saboru:panel-notice", "Ficha guardada.");
  }, userId);
}

async function readLocalUserData(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("saboru-offline", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const count = (store: string) =>
      new Promise<number>((resolve, reject) => {
        const countRequest = db.transaction(store).objectStore(store).count();
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });

    const result = {
      outbox: await count("outbox"),
      favorites: await count("favorites"),
      snapshot: await count("snapshot"),
      caches: await caches.keys(),
      viewer: localStorage.getItem("saboru:viewer"),
      notice: sessionStorage.getItem("saboru:panel-notice"),
    };
    db.close();
    return result;
  });
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

      const account = await withDb(async (client) => {
        const result = await client.query<{
          id: string;
          role: string;
          privacy_accepted_at: string | null;
          privacy_version: string | null;
        }>(
          `select id, role, privacy_accepted_at, privacy_version
           from public.profiles
           where email = $1`,
          [email],
        );
        return result.rows[0];
      });
      expect(account?.role).toBe("student");
      expect(account?.privacy_accepted_at).not.toBeNull();
      expect(account?.privacy_version).toBe(PRIVACY_VERSION);

      await seedLocalUserData(page, account!.id);
      let dialogMessage = "";
      page.once("dialog", async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await page.getByRole("button", { name: "Salir" }).click();
      await expect(page).toHaveURL(/\/login$/);
      expect(dialogMessage).toContain("pendiente");

      await expect
        .poll(async () => (await readLocalUserData(page)).outbox)
        .toBe(0);

      const local = await readLocalUserData(page);
      expect(local.favorites).toBe(0);
      expect(local.snapshot).toBe(1);
      expect(local.caches).not.toContain("pages");
      expect(local.viewer).toBeNull();
      expect(local.notice).toBeNull();

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
    await page
      .getByRole("checkbox", { name: /política de privacidad/i })
      .check();
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.locator("[data-slot='alert'][role='alert']")).toContainText(
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

  test("el registro exige aceptar la política de privacidad", async ({
    page,
    browserName,
  }) => {
    const email = `e2e.consent.${browserName}.${randomUUID()}@uptc.edu.co`;

    await page.goto("/registro");
    await page.getByLabel("Correo electrónico").fill(email);
    await page
      .locator("form")
      .evaluate((form) => form.setAttribute("novalidate", ""));
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.locator("[data-slot='alert'][role='alert']")).toContainText(
      /política de privacidad/i,
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
        const profile = await client.query<{
          id: string;
          role: string;
          privacy_accepted_at: string | null;
          privacy_version: string | null;
        }>(
          `select id, role, privacy_accepted_at, privacy_version
           from public.profiles
           where email = $1`,
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
          privacyAcceptedAt: profile.rows[0]?.privacy_accepted_at,
          privacyVersion: profile.rows[0]?.privacy_version,
          acceptedBy: invite.rows[0]?.accepted_by,
          ownerId: establishment.rows[0]?.owner_id,
        };
      });

      expect(state.role).toBe("vendor");
      expect(state.privacyAcceptedAt).not.toBeNull();
      expect(state.privacyVersion).toBe(PRIVACY_VERSION);
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
    await page
      .getByRole("checkbox", { name: /política de privacidad/i })
      .check();
    await page.getByRole("button", { name: "Aceptar invitación" }).click();

    await expect(page.locator("[data-slot='alert'][role='alert']")).toContainText(/invitación/i);
  });

  test("un admin entra a /admin y cierra sesión desde el panel", async ({
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
        page.getByRole("heading", { name: "Moderación y locales" }),
      ).toBeVisible();

      // Cierre desde /admin con el hook cliente: sincroniza, limpia y navega.
      await seedLocalUserData(page, adminId);
      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await expect(page).toHaveURL(/\/login$/);
      await expect
        .poll(async () => (await readLocalUserData(page)).outbox)
        .toBe(0);

      const local = await readLocalUserData(page);
      expect(local.favorites).toBe(0);
      expect(local.snapshot).toBe(1);
      expect(local.caches).not.toContain("pages");
      expect(local.viewer).toBeNull();
      expect(local.notice).toBeNull();

      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login$/);
    } finally {
      await deleteAuthUsers([adminId].filter(Boolean));
    }
  });
});
