import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const connectionString =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString });
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

type ExtensionRow = { extname: string; schema: string };
type TableRow = { schemaname: string; tablename: string };
type BooleanRow = { within: boolean };

describe("PostGIS en el schema extensions", () => {
  it("instala la extensión postgis en extensions, no en public", async () => {
    const result = await client.query<ExtensionRow>(`
      select e.extname, n.nspname as schema
      from pg_extension e
      join pg_namespace n on n.oid = e.extnamespace
      where e.extname = 'postgis'
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      extname: "postgis",
      schema: "extensions",
    });
  });

  it("deja spatial_ref_sys en extensions y fuera de public", async () => {
    const result = await client.query<TableRow>(`
      select schemaname, tablename
      from pg_tables
      where tablename = 'spatial_ref_sys'
      order by schemaname
    `);

    expect(result.rows).toEqual([
      { schemaname: "extensions", tablename: "spatial_ref_sys" },
    ]);
  });
});

describe("geoespacial disponible para los roles de la app", () => {
  it("califica geography y st_dwithin desde extensions como postgres", async () => {
    const result = await client.query<BooleanRow>(`
      select extensions.st_dwithin(
        extensions.st_point(-73.3567, 5.5520)::extensions.geography,
        extensions.st_point(-73.3561, 5.5526)::extensions.geography,
        1000
      ) as within
    `);

    expect(result.rows[0]?.within).toBe(true);
  });

  it("funciona también con el rol authenticated", async () => {
    await client.query("begin");
    try {
      await client.query("set local role authenticated");

      const result = await client.query<BooleanRow>(`
        select extensions.st_dwithin(
          extensions.st_point(-73.3567, 5.5520)::extensions.geography,
          extensions.st_point(-73.3561, 5.5526)::extensions.geography,
          1000
        ) as within
      `);

      expect(result.rows[0]?.within).toBe(true);
    } finally {
      await client.query("rollback");
    }
  });
});
