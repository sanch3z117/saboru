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
  insertProduct,
  insertReview,
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

async function createVendor(name = "Local del vendedor") {
  const vendorId = await insertAuthUser(
    client,
    `vendor.panel.${randomUUID()}@uptc.edu.co`,
  );
  await client.query(
    "update public.profiles set role = 'vendor' where id = $1",
    [vendorId],
  );
  const establishmentId = await insertEstablishment(client, {
    name: `${name} ${randomUUID()}`,
    ownerId: vendorId,
  });

  return { vendorId, establishmentId };
}

async function createStudent() {
  return insertAuthUser(client, `student.panel.${randomUUID()}@uptc.edu.co`);
}

function photoPath(establishmentId: string) {
  return `${establishmentId}/${randomUUID()}.jpg`;
}

async function insertPhotoObject(name: string, ownerId: string | null) {
  return client.query(
    `insert into storage.objects (bucket_id, name, owner)
     values ('establishment-photos', $1, $2)`,
    [name, ownerId],
  );
}

describe("panel del vendedor: aislamiento de datos", () => {
  it("solo puede actualizar su propia ficha", async () => {
    const owner = await createVendor("Propio");
    const other = await createVendor("Ajeno");

    const own = await asAuthenticated(client, owner.vendorId, () =>
      client.query(
        "update public.establishments set name = 'Nombre nuevo' where id = $1",
        [owner.establishmentId],
      ),
    );
    expect(own.rowCount).toBe(1);

    const foreign = await asAuthenticated(client, owner.vendorId, () =>
      client.query(
        "update public.establishments set name = 'Hackeado' where id = $1",
        [other.establishmentId],
      ),
    );
    expect(foreign.rowCount).toBe(0);
  });

  it("no puede leer la ficha en borrador de otro vendedor", async () => {
    const owner = await createVendor("Visible");
    const otherId = await insertEstablishment(client, {
      name: `Borrador ${randomUUID()}`,
      ownerId: null,
      status: "draft",
    });

    const foreign = await asAuthenticated(client, owner.vendorId, () =>
      client.query("select id from public.establishments where id = $1", [
        otherId,
      ]),
    );
    expect(foreign.rowCount).toBe(0);
  });

  it("solo puede crear, editar y borrar productos de su local", async () => {
    const owner = await createVendor("Con productos");
    const other = await createVendor("Sin productos");

    const created = await asAuthenticated(client, owner.vendorId, () =>
      client.query(
        `insert into public.products
           (establishment_id, name, price_cop, category)
         values ($1, 'Producto propio', 9000, 'almuerzo')
         returning id`,
        [owner.establishmentId],
      ),
    );
    expect(created.rowCount).toBe(1);
    const productId = created.rows[0].id as string;

    await expect(
      asAuthenticated(client, owner.vendorId, () =>
        client.query(
          `insert into public.products
             (establishment_id, name, price_cop)
           values ($1, 'Producto ajeno', 9000)`,
          [other.establishmentId],
        ),
      ),
    ).rejects.toThrow();

    const updateForeign = await asAuthenticated(client, owner.vendorId, () =>
      client.query(
        "update public.products set name = 'Hackeado' where establishment_id = $1",
        [other.establishmentId],
      ),
    );
    expect(updateForeign.rowCount).toBe(0);

    const deleteForeign = await asAuthenticated(client, owner.vendorId, () =>
      client.query("delete from public.products where id = $1", [productId]),
    );
    expect(deleteForeign.rowCount).toBe(1);
  });

  it("las RPC de estadísticas rechazan a vendedores ajenos y estudiantes", async () => {
    const owner = await createVendor("Stats");
    const other = await createVendor("Intruso");
    const studentId = await createStudent();

    await expect(
      asAuthenticated(client, other.vendorId, () =>
        client.query("select * from public.vendor_product_stats($1)", [
          owner.establishmentId,
        ]),
      ),
    ).rejects.toThrow(/forbidden/);

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query("select * from public.vendor_top_products($1)", [
          owner.establishmentId,
        ]),
      ),
    ).rejects.toThrow(/forbidden/);

    await expect(
      asAnon(client, () =>
        client.query("select * from public.vendor_views_by_hour($1)", [
          owner.establishmentId,
        ]),
      ),
    ).rejects.toThrow();
  });

  it("un local suspendido conserva sus agregados para el dueño", async () => {
    const owner = await createVendor("Suspendido");
    const productId = await insertProduct(client, owner.establishmentId);

    for (let index = 0; index < 5; index += 1) {
      const studentId = await createStudent();
      await insertReview(client, {
        userId: studentId,
        establishmentId: owner.establishmentId,
        productId,
      });
    }

    await client.query(
      "update public.establishments set status = 'suspended' where id = $1",
      [owner.establishmentId],
    );

    const comparison = await asAuthenticated(client, owner.vendorId, () =>
      client.query(
        "select local_avg, campus_avg, local_review_count from public.vendor_campus_comparison($1)",
        [owner.establishmentId],
      ),
    );

    expect(comparison.rowCount).toBe(1);
    expect(comparison.rows[0].local_review_count).toBe(5);
  });
});

describe("bucket establishment-photos", () => {
  it("tiene lectura pública y límites de tipo y tamaño", async () => {
    const bucket = await client.query<{
      public: boolean;
      file_size_limit: string;
      allowed_mime_types: string[];
    }>(
      `select public, file_size_limit, allowed_mime_types
       from storage.buckets where id = 'establishment-photos'`,
    );

    expect(bucket.rowCount).toBe(1);
    expect(bucket.rows[0].public).toBe(true);
    expect(Number(bucket.rows[0].file_size_limit)).toBe(5 * 1024 * 1024);
    expect(bucket.rows[0].allowed_mime_types).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("el dueño escribe en su carpeta y nadie más", async () => {
    const owner = await createVendor("Fotos");
    const other = await createVendor("Fotos ajenas");

    const own = await asAuthenticated(client, owner.vendorId, () =>
      insertPhotoObject(photoPath(owner.establishmentId), owner.vendorId),
    );
    expect(own.rowCount).toBe(1);

    await expect(
      asAuthenticated(client, other.vendorId, () =>
        insertPhotoObject(photoPath(owner.establishmentId), other.vendorId),
      ),
    ).rejects.toThrow();

    await expect(
      asAnon(client, () =>
        insertPhotoObject(photoPath(owner.establishmentId), null),
      ),
    ).rejects.toThrow();

    const deleteForeign = await asAuthenticated(client, other.vendorId, async () => {
      await client.query(
        "select set_config('storage.allow_delete_query', 'true', true)",
      );
      return client.query(
        "delete from storage.objects where bucket_id = 'establishment-photos' and name like $1",
        [`${owner.establishmentId}/%`],
      );
    });
    expect(deleteForeign.rowCount).toBe(0);
  });

  it("rechaza rutas sin uuid de establecimiento", async () => {
    const owner = await createVendor("Ruta inválida");

    await expect(
      asAuthenticated(client, owner.vendorId, () =>
        insertPhotoObject(`no-es-uuid/${randomUUID()}.jpg`, owner.vendorId),
      ),
    ).rejects.toThrow();

    const parsed = await client.query<{ value: string | null }>(
      "select public.photo_establishment_id($1)::text as value",
      [`no-es-uuid/${randomUUID()}.jpg`],
    );
    expect(parsed.rows[0].value).toBeNull();
  });
});

describe("horario y ubicación de la ficha", () => {
  it("el dueño actualiza la ubicación y el horario", async () => {
    const owner = await createVendor("Ficha completa");

    await asAuthenticated(client, owner.vendorId, () =>
      client.query(
        "select public.vendor_set_establishment_location($1, $2, $3)",
        [owner.establishmentId, 5.553, -73.357],
      ),
    );

    const location = await client.query<{ lat: string; lng: string }>(
      `select
         extensions.st_y(location::extensions.geometry)::text as lat,
         extensions.st_x(location::extensions.geometry)::text as lng
       from public.establishments where id = $1`,
      [owner.establishmentId],
    );
    expect(Number(location.rows[0].lat)).toBeCloseTo(5.553, 4);
    expect(Number(location.rows[0].lng)).toBeCloseTo(-73.357, 4);

    const schedule = { mon: [["08:00", "17:00"]], sat: [] };
    const update = await asAuthenticated(client, owner.vendorId, () =>
      client.query(
        "update public.establishments set schedule = $1::jsonb where id = $2",
        [JSON.stringify(schedule), owner.establishmentId],
      ),
    );
    expect(update.rowCount).toBe(1);

    const stored = await client.query<{ schedule: unknown }>(
      "select schedule from public.establishments where id = $1",
      [owner.establishmentId],
    );
    expect(stored.rows[0].schedule).toEqual(schedule);
  });

  it("otro vendedor no mueve el local y las coordenadas inválidas fallan", async () => {
    const owner = await createVendor("Ubicación propia");
    const other = await createVendor("Ubicación ajena");

    await expect(
      asAuthenticated(client, other.vendorId, () =>
        client.query(
          "select public.vendor_set_establishment_location($1, $2, $3)",
          [owner.establishmentId, 5.6, -73.4],
        ),
      ),
    ).rejects.toThrow(/forbidden/);

    await expect(
      asAuthenticated(client, owner.vendorId, () =>
        client.query(
          "select public.vendor_set_establishment_location($1, $2, $3)",
          [owner.establishmentId, 120, -73.357],
        ),
      ),
    ).rejects.toThrow(/invalid_coordinates/);

    await expect(
      asAnon(client, () =>
        client.query(
          "select public.vendor_set_establishment_location($1, $2, $3)",
          [owner.establishmentId, 5.553, -73.357],
        ),
      ),
    ).rejects.toThrow();

    const untouched = await client.query<{ lat: string }>(
      `select extensions.st_y(location::extensions.geometry)::text as lat
       from public.establishments where id = $1`,
      [owner.establishmentId],
    );
    expect(Number(untouched.rows[0].lat)).toBeCloseTo(5.552, 3);
  });

  it("solo el dueño puede cambiar el horario", async () => {
    const owner = await createVendor("Horario propio");
    const other = await createVendor("Horario ajeno");

    const foreign = await asAuthenticated(client, other.vendorId, () =>
      client.query(
        `update public.establishments set schedule = $1::jsonb where id = $2`,
        [JSON.stringify({ mon: [["09:00", "10:00"]] }), owner.establishmentId],
      ),
    );
    expect(foreign.rowCount).toBe(0);

    const stored = await client.query<{ schedule: unknown }>(
      "select schedule from public.establishments where id = $1",
      [owner.establishmentId],
    );
    expect(stored.rows[0].schedule).toEqual({});
  });
});
