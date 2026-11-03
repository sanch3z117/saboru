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

import { createClient, type CountRow } from "./support";

let client: Client;

const BLOCK_CENTRAL = "00000000-0000-4000-8000-000000000001";
const SEED_PRODUCT = "20000000-0000-4000-8000-000000000001";
const SEED_UNAVAILABLE = "20000000-0000-4000-8000-000000000024";

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

async function count(table: string) {
  const result = await client.query<CountRow>(
    `select count(*)::int as count from public.${table}`,
  );
  return result.rows[0]?.count;
}

describe("seed ficticio", () => {
  it("siembra 6 bloques, 7 establecimientos y 24 productos", async () => {
    expect(await count("campus_blocks")).toBe(6);
    expect(await count("establishments")).toBe(7);
    expect(await count("products")).toBe(24);
  });

  it("no crea perfiles, favoritos ni reportes", async () => {
    expect(await count("profiles")).toBe(0);
    expect(await count("favorites")).toBe(0);
    expect(await count("review_reports")).toBe(0);
  });

  it("deja los locales activos, sin dueño y con planes variados", async () => {
    const result = await client.query<{
      active: number;
      unowned: number;
      plans: number;
    }>(`
      select
        count(*) filter (where status = 'active')::int as active,
        count(*) filter (where owner_id is null)::int as unowned,
        count(distinct plan)::int as plans
      from public.establishments
    `);

    expect(result.rows[0]).toEqual({ active: 7, unowned: 7, plans: 3 });
  });

  it("incluye un producto del seed en search_products", async () => {
    const result = await client.query<{
      id: string;
      establishment_name: string;
    }>(
      `select id, establishment_name
       from public.search_products(
         10000, $1::uuid, 5000, 'almuerzos'
       )`,
      [BLOCK_CENTRAL],
    );

    const ids = result.rows.map((row) => row.id);
    expect(ids).toContain(SEED_PRODUCT);

    const seed = result.rows.find((row) => row.id === SEED_PRODUCT);
    expect(seed?.establishment_name).toBe("Comedor La Cosecha");
  });

  it("no expone un producto no disponible del seed", async () => {
    const result = await client.query<{ id: string }>(
      `select id from public.search_products(
        7000, $1::uuid, 5000, 'bebidas'
      )`,
      [BLOCK_CENTRAL],
    );

    expect(result.rows.map((row) => row.id)).not.toContain(SEED_UNAVAILABLE);
  });
});
