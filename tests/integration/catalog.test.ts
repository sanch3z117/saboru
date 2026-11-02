import { randomUUID } from "node:crypto";

import type { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  asAnon,
  asAuthenticated,
  createClient,
  insertAuthUser,
  insertEstablishment,
  promoteToAdmin,
  type CountRow,
} from "./support";

let client: Client;

beforeAll(async () => {
  client = createClient();
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  await client.query("begin");
});

afterEach(async () => {
  await client.query("rollback");
});

async function createAdmin() {
  const id = await insertAuthUser(client, `admin.${randomUUID()}@uptc.edu.co`);
  await promoteToAdmin(client, id);
  return id;
}

async function createEstablishment(options: {
  name: string;
  status?: "draft" | "pending" | "active" | "suspended";
  ownerId?: string | null;
}) {
  return insertEstablishment(client, options);
}

async function createProduct(
  establishmentId: string,
  options: { name?: string; price?: number; available?: boolean } = {},
) {
  const id = randomUUID();

  await client.query(
    `insert into public.products
       (id, establishment_id, name, price_cop, available)
     values ($1, $2, $3, $4, $5)`,
    [
      id,
      establishmentId,
      options.name ?? "Producto",
      options.price ?? 9000,
      options.available ?? true,
    ],
  );

  return id;
}

async function createVendor(adminId: string, establishmentId: string) {
  const email = `vendor.${randomUUID()}@example.com`;

  await client.query(
    `insert into public.vendor_invites (email, establishment_id, invited_by)
     values ($1, $2, $3)`,
    [email, establishmentId, adminId],
  );

  return insertAuthUser(client, email);
}

function productIds(rows: { id: string }[]) {
  return new Set(rows.map((row) => row.id));
}

function establishmentIds(rows: { id: string }[]) {
  return new Set(rows.map((row) => row.id));
}

describe("products", () => {
  it("el vendedor crea, actualiza y borra productos de su local", async () => {
    const adminId = await createAdmin();
    const establishmentId = await createEstablishment({
      name: "Local propio",
    });
    const vendorId = await createVendor(adminId, establishmentId);

    const insertedProduct = await asAuthenticated(client, vendorId, () =>
      client.query<{ id: string }>(
        `insert into public.products (establishment_id, name, price_cop)
         values ($1, $2, $3)
         returning id`,
        [establishmentId, "Frito", 8000],
      ),
    );

    const productId = insertedProduct.rows[0]?.id;
    if (!productId) {
      throw new Error("El insert del producto no devolvió id");
    }

    const inserted = await client.query<{ name: string }>(
      "select name from public.products where id = $1",
      [productId],
    );
    expect(inserted.rows[0]?.name).toBe("Frito");

    await asAuthenticated(client, vendorId, () =>
      client.query("update public.products set name = $1 where id = $2", [
        "Frito grande",
        productId,
      ]),
    );

    const updated = await client.query<{ name: string }>(
      "select name from public.products where id = $1",
      [productId],
    );
    expect(updated.rows[0]?.name).toBe("Frito grande");

    await asAuthenticated(client, vendorId, () =>
      client.query("delete from public.products where id = $1", [productId]),
    );

    const remaining = await client.query<CountRow>(
      "select count(*)::int as count from public.products where id = $1",
      [productId],
    );
    expect(remaining.rows[0]?.count).toBe(0);
  });

  it("un vendedor no puede tocar los productos de otro local", async () => {
    const adminId = await createAdmin();
    const establishmentA = await createEstablishment({ name: "Local A" });
    const establishmentB = await createEstablishment({ name: "Local B" });
    const vendorA = await createVendor(adminId, establishmentA);
    const vendorB = await createVendor(adminId, establishmentB);
    const productA = await createProduct(establishmentA, { name: "De A" });

    const update = await asAuthenticated(client, vendorB, () =>
      client.query("update public.products set name = $1 where id = $2", [
        "Hackeado",
        productA,
      ]),
    );
    expect(update.rowCount).toBe(0);

    const remove = await asAuthenticated(client, vendorB, () =>
      client.query("delete from public.products where id = $1", [productA]),
    );
    expect(remove.rowCount).toBe(0);

    await expect(
      asAuthenticated(client, vendorB, () =>
        client.query(
          `insert into public.products (establishment_id, name, price_cop)
           values ($1, $2, $3)`,
          [establishmentA, "Intruso", 5000],
        ),
      ),
    ).rejects.toThrow(/row-level security/);

    const stillThere = await client.query<{ name: string }>(
      "select name from public.products where id = $1",
      [productA],
    );
    expect(stillThere.rows[0]?.name).toBe("De A");
    expect(vendorA).toBeTruthy();
  });

  it("el vendedor no puede cambiar id ni establishment_id", async () => {
    const adminId = await createAdmin();
    const establishmentA = await createEstablishment({ name: "Local A" });
    const establishmentB = await createEstablishment({ name: "Local B" });
    const vendorId = await createVendor(adminId, establishmentA);
    const productId = await createProduct(establishmentA);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          "update public.products set establishment_id = $1 where id = $2",
          [establishmentB, productId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query("update public.products set id = $1 where id = $2", [
          randomUUID(),
          productId,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("price_cop <= 0 falla por check", async () => {
    const adminId = await createAdmin();
    const establishmentId = await createEstablishment({ name: "Local" });
    const vendorId = await createVendor(adminId, establishmentId);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          `insert into public.products (establishment_id, name, price_cop)
           values ($1, $2, $3)`,
          [establishmentId, "Gratis", 0],
        ),
      ),
    ).rejects.toThrow(/check constraint|products_price_positive/);
  });

  it("público solo ve productos disponibles de locales activos; admin ve todo", async () => {
    const adminId = await createAdmin();
    const studentId = await insertAuthUser(
      client,
      `estudiante.${randomUUID()}@uptc.edu.co`,
    );
    const active = await createEstablishment({ name: "Activo" });
    const draft = await createEstablishment({
      name: "Borrador",
      status: "draft",
    });
    const suspended = await createEstablishment({
      name: "Suspendido",
      status: "suspended",
    });

    const visible = await createProduct(active);
    const unavailable = await createProduct(active, { available: false });
    const draftProduct = await createProduct(draft);
    const suspendedProduct = await createProduct(suspended);

    const publicView = await asAnon(client, () =>
      client.query<{ id: string }>("select id from public.products"),
    );
    expect(productIds(publicView.rows)).toEqual(new Set([visible]));

    const studentView = await asAuthenticated(client, studentId, () =>
      client.query<{ id: string }>("select id from public.products"),
    );
    expect(productIds(studentView.rows)).toEqual(new Set([visible]));

    const adminView = await asAuthenticated(client, adminId, () =>
      client.query<{ id: string }>("select id from public.products"),
    );
    expect(productIds(adminView.rows)).toEqual(
      new Set([visible, unavailable, draftProduct, suspendedProduct]),
    );
  });
});

describe("visibilidad de establishments", () => {
  it("público solo ve activos; el vendedor ve el propio; admin ve todo", async () => {
    const adminId = await createAdmin();
    const studentId = await insertAuthUser(
      client,
      `estudiante.${randomUUID()}@uptc.edu.co`,
    );
    const active = await createEstablishment({ name: "Activo" });
    const draft = await createEstablishment({
      name: "Borrador",
      status: "draft",
    });
    const suspended = await createEstablishment({
      name: "Suspendido",
      status: "suspended",
    });

    const ownDraft = await createEstablishment({
      name: "Propio en borrador",
      status: "draft",
    });
    const vendorId = await createVendor(adminId, ownDraft);

    const publicView = await asAnon(client, () =>
      client.query<{ id: string }>("select id from public.establishments"),
    );
    expect(establishmentIds(publicView.rows)).toEqual(new Set([active]));

    const studentView = await asAuthenticated(client, studentId, () =>
      client.query<{ id: string }>("select id from public.establishments"),
    );
    expect(establishmentIds(studentView.rows)).toEqual(new Set([active]));

    const vendorView = await asAuthenticated(client, vendorId, () =>
      client.query<{ id: string }>("select id from public.establishments"),
    );
    expect(establishmentIds(vendorView.rows)).toEqual(
      new Set([active, ownDraft]),
    );

    const adminView = await asAuthenticated(client, adminId, () =>
      client.query<{ id: string }>("select id from public.establishments"),
    );
    expect(establishmentIds(adminView.rows)).toEqual(
      new Set([active, draft, suspended, ownDraft]),
    );
  });

  it("un vendedor no puede editar la ficha de otro local (parte de tabla de la prueba 12)", async () => {
    const adminId = await createAdmin();
    const establishmentA = await createEstablishment({ name: "Local A" });
    const establishmentB = await createEstablishment({ name: "Local B" });
    await createVendor(adminId, establishmentA);
    const vendorB = await createVendor(adminId, establishmentB);

    const result = await asAuthenticated(client, vendorB, () =>
      client.query(
        "update public.establishments set photos = $1 where id = $2",
        [["fotos-de-otro/robada.webp"], establishmentA],
      ),
    );
    expect(result.rowCount).toBe(0);
  });

  it("el vendedor no puede cambiar plan, status, slug ni owner_id", async () => {
    const adminId = await createAdmin();
    const establishmentId = await createEstablishment({ name: "Local" });
    const vendorId = await createVendor(adminId, establishmentId);

    for (const statement of [
      "update public.establishments set plan = 'pro' where id = $1",
      "update public.establishments set status = 'active' where id = $1",
      "update public.establishments set slug = 'otro-slug' where id = $1",
      "update public.establishments set owner_id = $1 where id = $1",
    ]) {
      await expect(
        asAuthenticated(client, vendorId, () =>
          client.query(statement, [establishmentId]),
        ),
      ).rejects.toThrow(/permission denied/);
    }

    await asAuthenticated(client, vendorId, () =>
      client.query("update public.establishments set name = $1 where id = $2", [
        "Nombre permitido",
        establishmentId,
      ]),
    );

    const updated = await client.query<{ name: string }>(
      "select name from public.establishments where id = $1",
      [establishmentId],
    );
    expect(updated.rows[0]?.name).toBe("Nombre permitido");
  });
});

describe("campus_blocks", () => {
  it("anon y authenticated pueden leer los 6 bloques del seed", async () => {
    const anonView = await asAnon(client, () =>
      client.query<CountRow>(
        "select count(*)::int as count from public.campus_blocks",
      ),
    );
    expect(anonView.rows[0]?.count).toBe(6);

    const studentId = await insertAuthUser(
      client,
      `estudiante.${randomUUID()}@uptc.edu.co`,
    );
    const authView = await asAuthenticated(client, studentId, () =>
      client.query<CountRow>(
        "select count(*)::int as count from public.campus_blocks",
      ),
    );
    expect(authView.rows[0]?.count).toBe(6);
  });

  it("el seed guarda longitud primero y latitud después", async () => {
    const result = await client.query<{
      lat: string;
      lon: string;
    }>(
      `select
         round(extensions.st_y(location::extensions.geometry)::numeric, 4)::text as lat,
         round(extensions.st_x(location::extensions.geometry)::numeric, 4)::text as lon
       from public.campus_blocks
       where id = '00000000-0000-4000-8000-000000000001'`,
    );

    expect(result.rows[0]).toEqual({ lat: "5.5520", lon: "-73.3567" });
  });

  it("nadie puede escribir bloques desde el cliente", async () => {
    const studentId = await insertAuthUser(
      client,
      `estudiante.${randomUUID()}@uptc.edu.co`,
    );

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          `insert into public.campus_blocks (name, location)
           values ('Inventado', extensions.st_point(0, 0)::extensions.geography)`,
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asAnon(client, () =>
        client.query(
          "update public.campus_blocks set name = 'Otro' where id = $1",
          ["00000000-0000-4000-8000-000000000001"],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query("delete from public.campus_blocks"),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("vendor_invites: FK y owner_id", () => {
  it("falla si establishment_id no existe (FK de 1.3)", async () => {
    const adminId = await createAdmin();

    await client.query("savepoint fk");
    await expect(
      client.query(
        `insert into public.vendor_invites (email, establishment_id, invited_by)
         values ($1, $2, $3)`,
        ["fantasma@example.com", randomUUID(), adminId],
      ),
    ).rejects.toThrow(/foreign key/);
    await client.query("rollback to savepoint fk");
  });

  it("asigna owner_id al aceptar y no pisa un local que ya tiene dueño", async () => {
    const adminId = await createAdmin();

    const freeEstablishment = await createEstablishment({
      name: "Sin dueño",
    });
    const vendorId = await createVendor(adminId, freeEstablishment);

    const owned = await client.query<{ owner_id: string }>(
      "select owner_id from public.establishments where id = $1",
      [freeEstablishment],
    );
    expect(owned.rows[0]?.owner_id).toBe(vendorId);

    const ownerId = await insertAuthUser(
      client,
      `dueno.${randomUUID()}@uptc.edu.co`,
    );
    await client.query(
      "update public.profiles set role = 'vendor' where id = $1",
      [ownerId],
    );
    const alreadyOwned = await createEstablishment({
      name: "Ya tiene dueño",
      ownerId,
    });

    const secondVendor = await createVendor(adminId, alreadyOwned);
    const ownerAfter = await client.query<{ owner_id: string }>(
      "select owner_id from public.establishments where id = $1",
      [alreadyOwned],
    );
    expect(ownerAfter.rows[0]?.owner_id).toBe(ownerId);
    expect(ownerAfter.rows[0]?.owner_id).not.toBe(secondVendor);
  });

  it("el backfill de owner_id solo toca locales sin dueño", async () => {
    const adminId = await createAdmin();

    const acceptedVendorId = await insertAuthUser(
      client,
      `aceptado.${randomUUID()}@uptc.edu.co`,
    );
    const currentOwnerId = await insertAuthUser(
      client,
      `actual.${randomUUID()}@uptc.edu.co`,
    );

    const pendingEstablishment = await createEstablishment({
      name: "Pendiente de backfill",
    });
    const ownedEstablishment = await createEstablishment({
      name: "Con dueño previo",
      ownerId: currentOwnerId,
    });

    await client.query(
      `insert into public.vendor_invites
         (email, establishment_id, invited_by, accepted_at, accepted_by)
       values ($1, $2, $3, now(), $4)`,
      [
        `previo.${randomUUID()}@example.com`,
        pendingEstablishment,
        adminId,
        acceptedVendorId,
      ],
    );

    await client.query(`
      update public.establishments e
         set owner_id = vi.accepted_by
        from public.vendor_invites vi
       where vi.establishment_id = e.id
         and vi.accepted_at is not null
         and vi.accepted_by is not null
         and e.owner_id is null
    `);

    const pending = await client.query<{ owner_id: string }>(
      "select owner_id from public.establishments where id = $1",
      [pendingEstablishment],
    );
    expect(pending.rows[0]?.owner_id).toBe(acceptedVendorId);

    const owned = await client.query<{ owner_id: string }>(
      "select owner_id from public.establishments where id = $1",
      [ownedEstablishment],
    );
    expect(owned.rows[0]?.owner_id).toBe(currentOwnerId);
  });
});
