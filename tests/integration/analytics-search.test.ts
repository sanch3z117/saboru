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
  type CountRow,
} from "./support";

let client: Client;

const BLOCK_CENTRAL = "00000000-0000-4000-8000-000000000001";
const RADIUS_M = 5000;

type SearchRow = {
  id: string;
  price_cop: number;
  category: string;
  establishment_id: string;
  distance_m: number;
};

type EventRow = {
  budget: number | null;
  block_id: string | null;
  category: string | null;
};

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

function callSearch(
  params: [number | null, string | null, number | null, string | null],
) {
  return client.query<SearchRow>(
    `select * from public.search_products(
       $1::integer, $2::uuid, $3::double precision, $4::text
     )`,
    params,
  );
}

function callLogSearch(params: [number | null, string | null, string | null]) {
  return client.query(
    `select public.log_search($1::integer, $2::uuid, $3::text)`,
    params,
  );
}

async function createStudent() {
  return insertAuthUser(client, `estudiante.${randomUUID()}@uptc.edu.co`);
}

describe("acceso directo a la analítica", () => {
  it("anon y authenticated no pueden leer ni escribir las tablas", async () => {
    const studentId = await createStudent();

    for (const table of ["search_events", "product_views"]) {
      await expect(
        asAnon(client, () =>
          client.query(`select * from public.${table} limit 1`),
        ),
      ).rejects.toThrow(/permission denied/);

      await expect(
        asAuthenticated(client, studentId, () =>
          client.query(`select * from public.${table} limit 1`),
        ),
      ).rejects.toThrow(/permission denied/);

      await expect(
        asAnon(client, () =>
          client.query(`insert into public.${table} default values`),
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe("log_search", () => {
  it("registra búsquedas como anon con valores nulos", async () => {
    await asAnon(client, () => callLogSearch([null, null, null]));

    const rows = await client.query<EventRow>(
      "select budget, block_id, category from public.search_events",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toEqual({
      budget: null,
      block_id: null,
      category: null,
    });
  });

  it("registra una búsqueda como authenticated y normaliza la categoría", async () => {
    const studentId = await createStudent();

    await asAuthenticated(client, studentId, () =>
      callLogSearch([10000, BLOCK_CENTRAL, "  fritos  "]),
    );

    const rows = await client.query<EventRow>(
      "select budget, block_id, category from public.search_events",
    );
    expect(rows.rows[0]).toEqual({
      budget: 10000,
      block_id: BLOCK_CENTRAL,
      category: "fritos",
    });
  });

  it("rechaza presupuesto inválido, bloque inexistente y categoría larga", async () => {
    for (const budget of [0, -1]) {
      await expect(
        asAnon(client, () => callLogSearch([budget, null, null])),
      ).rejects.toThrow(/invalid_budget/);
    }

    await expect(
      asAnon(client, () => callLogSearch([null, randomUUID(), null])),
    ).rejects.toThrow(/invalid_block/);

    await expect(
      asAnon(client, () => callLogSearch([null, null, "a".repeat(51)])),
    ).rejects.toThrow(/invalid_category/);
  });
});

describe("log_product_view", () => {
  it("registra solo productos disponibles de locales activos", async () => {
    const active = await insertEstablishment(client);
    const available = await insertProduct(client, active);
    const unavailable = await insertProduct(client, active, {
      available: false,
    });
    const draft = await insertEstablishment(client, { status: "draft" });
    const draftProduct = await insertProduct(client, draft);

    await asAnon(client, () =>
      client.query("select public.log_product_view($1::uuid)", [available]),
    );
    await asAnon(client, () =>
      client.query("select public.log_product_view($1::uuid)", [unavailable]),
    );
    await asAnon(client, () =>
      client.query("select public.log_product_view($1::uuid)", [draftProduct]),
    );
    await asAnon(client, () =>
      client.query("select public.log_product_view($1::uuid)", [randomUUID()]),
    );

    const rows = await client.query<{ product_id: string }>(
      "select product_id from public.product_views",
    );
    expect(rows.rows.map((row) => row.product_id)).toEqual([available]);
  });
});

describe("search_products", () => {
  async function createCatalog() {
    const near = await insertEstablishment(client, {
      name: "Cerca",
      lat: 5.552,
      lon: -73.3567,
    });
    const mid = await insertEstablishment(client, {
      name: "A 44 m",
      lat: 5.5524,
      lon: -73.3567,
    });
    const far = await insertEstablishment(client, {
      name: "A 6 km",
      lat: 5.61,
      lon: -73.3567,
    });
    const draft = await insertEstablishment(client, {
      name: "Borrador",
      status: "draft",
    });
    const suspended = await insertEstablishment(client, {
      name: "Suspendido",
      status: "suspended",
    });

    const cheap = await insertProduct(client, near, {
      name: "Frito barato",
      price: 5000,
    });
    const expensive = await insertProduct(client, near, {
      name: "Frito caro",
      price: 9000,
    });
    const midProduct = await insertProduct(client, mid, {
      name: "Bebida",
      price: 7000,
    });
    const farProduct = await insertProduct(client, far, {
      name: "Lejano",
      price: 1000,
    });
    const draftProduct = await insertProduct(client, draft);
    const suspendedProduct = await insertProduct(client, suspended);
    const unavailable = await insertProduct(client, near, {
      name: "Agotado",
      available: false,
    });

    await client.query(
      "update public.products set category = 'fritos' where id = any($1::uuid[])",
      [[cheap, expensive]],
    );
    await client.query(
      "update public.products set category = 'bebidas' where id = $1",
      [midProduct],
    );

    return {
      near,
      mid,
      far,
      cheap,
      expensive,
      midProduct,
      farProduct,
      draftProduct,
      suspendedProduct,
      unavailable,
    };
  }

  it("devuelve productos activos dentro del radio y ordena por distancia y precio", async () => {
    const catalog = await createCatalog();

    const result = await callSearch([null, BLOCK_CENTRAL, RADIUS_M, null]);
    expect(result.rows.map((row) => row.id)).toEqual([
      catalog.cheap,
      catalog.expensive,
      catalog.midProduct,
    ]);
    expect(result.rows[0]?.distance_m).toBeCloseTo(0, 3);
    expect(result.rows[2]?.distance_m).toBeGreaterThan(0);
  });

  it("aplica presupuesto y admite presupuesto null como sin límite", async () => {
    const catalog = await createCatalog();

    const withBudget = await callSearch([9000, BLOCK_CENTRAL, RADIUS_M, null]);
    expect(withBudget.rows.map((row) => row.id)).toEqual([
      catalog.cheap,
      catalog.expensive,
      catalog.midProduct,
    ]);

    const exact = await callSearch([5000, BLOCK_CENTRAL, RADIUS_M, null]);
    expect(exact.rows.map((row) => row.id)).toEqual([catalog.cheap]);

    const noLimit = await callSearch([null, BLOCK_CENTRAL, RADIUS_M, null]);
    expect(noLimit.rows).toHaveLength(3);
  });

  it("filtra por categoría exacta de 50 caracteres", async () => {
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId, {
      price: 4000,
    });
    const category = "x".repeat(50);

    await client.query(
      "update public.products set category = $1 where id = $2",
      [category, productId],
    );

    const result = await callSearch([null, BLOCK_CENTRAL, RADIUS_M, category]);
    expect(result.rows.map((row) => row.id)).toEqual([productId]);

    await expect(
      asAnon(client, () =>
        callSearch([null, BLOCK_CENTRAL, RADIUS_M, "x".repeat(51)]),
      ),
    ).rejects.toThrow(/invalid_category/);
  });

  it("excluye locales inactivos y productos no disponibles", async () => {
    const catalog = await createCatalog();

    const result = await callSearch([null, BLOCK_CENTRAL, RADIUS_M, null]);
    const ids = new Set(result.rows.map((row) => row.id));

    expect(ids.has(catalog.farProduct)).toBe(false);
    expect(ids.has(catalog.draftProduct)).toBe(false);
    expect(ids.has(catalog.suspendedProduct)).toBe(false);
    expect(ids.has(catalog.unavailable)).toBe(false);
  });

  it("el plan no altera resultados ni orden", async () => {
    const catalog = await createCatalog();

    const before = await callSearch([null, BLOCK_CENTRAL, RADIUS_M, null]);

    await client.query(
      "update public.establishments set plan = 'pro' where id = $1",
      [catalog.near],
    );
    await client.query(
      "update public.establishments set plan = 'featured' where id = $1",
      [catalog.mid],
    );

    const after = await callSearch([null, BLOCK_CENTRAL, RADIUS_M, null]);
    expect(after.rows.map((row) => row.id)).toEqual(
      before.rows.map((row) => row.id),
    );
  });

  it("rechaza presupuesto, bloque y radio inválidos", async () => {
    for (const budget of [0, -100]) {
      await expect(
        asAnon(client, () =>
          callSearch([budget, BLOCK_CENTRAL, RADIUS_M, null]),
        ),
      ).rejects.toThrow(/invalid_budget/);
    }

    await expect(
      asAnon(client, () => callSearch([null, null, RADIUS_M, null])),
    ).rejects.toThrow(/invalid_block/);

    await expect(
      asAnon(client, () => callSearch([null, randomUUID(), RADIUS_M, null])),
    ).rejects.toThrow(/invalid_block/);

    for (const radius of [0, -1, 5000.01]) {
      await expect(
        asAnon(client, () => callSearch([null, BLOCK_CENTRAL, radius, null])),
      ).rejects.toThrow(/invalid_radius/);
    }
  });

  it("también funciona para anon y authenticated", async () => {
    const catalog = await createCatalog();
    const studentId = await createStudent();

    const anonResult = await asAnon(client, () =>
      callSearch([null, BLOCK_CENTRAL, RADIUS_M, null]),
    );
    expect(anonResult.rows.map((row) => row.id)).toEqual([
      catalog.cheap,
      catalog.expensive,
      catalog.midProduct,
    ]);

    const authResult = await asAuthenticated(client, studentId, () =>
      callSearch([null, BLOCK_CENTRAL, RADIUS_M, null]),
    );
    expect(authResult.rows.map((row) => row.id)).toEqual([
      catalog.cheap,
      catalog.expensive,
      catalog.midProduct,
    ]);
  });

  it("acepta radio exactamente 5000 y descarta lo que queda fuera", async () => {
    const catalog = await createCatalog();

    const result = await callSearch([null, BLOCK_CENTRAL, 5000, null]);
    const ids = new Set(result.rows.map((row) => row.id));

    expect(ids.has(catalog.cheap)).toBe(true);
    expect(ids.has(catalog.midProduct)).toBe(true);
    expect(ids.has(catalog.farProduct)).toBe(false);

    const count = await client.query<CountRow>(
      "select count(*)::int as count from public.search_events",
    );
    expect(count.rows[0]?.count).toBe(0);
  });
});
