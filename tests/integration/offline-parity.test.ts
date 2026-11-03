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

import { searchCatalog } from "@/lib/catalog/search";
import { snapshotToSearchItems } from "@/lib/offline/snapshot";
import type { CatalogSnapshot } from "@/types/catalog";

import {
  asAnon,
  createClient,
  insertEstablishment,
  insertProduct,
} from "./support";

let client: Client;

const BLOCK = { latitude: 5.7, longitude: -73.1 };
const RADIUS_M = 5000;

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

async function insertBlock() {
  const id = randomUUID();
  await client.query(
    `insert into public.campus_blocks (id, name, location)
     values ($1, $2,
             extensions.st_point($3::double precision, $4::double precision)::extensions.geography)`,
    [id, `Bloque offline ${id}`, BLOCK.longitude, BLOCK.latitude],
  );
  return id;
}

async function seedCatalog() {
  const blockId = await insertBlock();

  const near = await insertEstablishment(client, {
    name: `Cerca ${randomUUID()}`,
    lat: 5.7005,
    lon: -73.1,
  });
  const far = await insertEstablishment(client, {
    name: `Lejos ${randomUUID()}`,
    lat: 5.71,
    lon: -73.1,
  });

  await client.query(
    `update public.establishments
        set schedule = '{"mon": [["08:00", "17:00"]]}'::jsonb
      where id = $1`,
    [near],
  );

  const nearCheap = await insertProduct(client, near, {
    name: "Cerca barato",
    price: 8000,
  });
  const nearExpensive = await insertProduct(client, near, {
    name: "Cerca caro",
    price: 12000,
  });
  const farCheap = await insertProduct(client, far, {
    name: "Lejos barato",
    price: 7000,
  });
  const farUnavailable = await insertProduct(client, far, {
    name: "Lejos agotado",
    price: 6000,
    available: false,
  });

  await client.query(
    `update public.products set category = 'almuerzo' where id = any($1::uuid[])`,
    [[nearCheap, nearExpensive]],
  );
  await client.query(
    `update public.products set category = 'cafe' where id = any($1::uuid[])`,
    [[farCheap, farUnavailable]],
  );

  return { blockId, near, far, nearCheap, nearExpensive, farCheap };
}

async function offlineSnapshot(establishmentIds: string[]) {
  const establishments = await client.query(
    `select id, name, slug, description, address, category, photos, schedule,
            status, plan, latitude, longitude
       from public.public_establishments
      where id = any($1::uuid[])`,
    [establishmentIds],
  );
  const products = await client.query(
    `select id, establishment_id, name, description, price_cop, category,
            photo_url, available, allergens
       from public.products
      where establishment_id = any($1::uuid[]) and available`,
    [establishmentIds],
  );

  return {
    establishments:
      establishments.rows as unknown as CatalogSnapshot["establishments"],
    products: products.rows as unknown as CatalogSnapshot["products"],
  };
}

async function rpcSearch(
  blockId: string,
  budget: number | null,
  category: string | null,
) {
  const result = await asAnon(client, () =>
    client.query<{ id: string; establishment_schedule: unknown }>(
      "select id, establishment_schedule from public.search_products($1, $2, $3, $4)",
      [budget, blockId, RADIUS_M, category],
    ),
  );
  return result.rows;
}

function offlineSearch(
  snapshot: Awaited<ReturnType<typeof offlineSnapshot>>,
  budget: number | null,
  category: string | null,
) {
  return searchCatalog(snapshotToSearchItems(snapshot, BLOCK), {
    budget,
    category,
    maxDistanceM: RADIUS_M,
    openNow: false,
  });
}

describe("paridad online/offline del catálogo", () => {
  it("el RPC y el snapshot dan los mismos ids en el mismo orden", async () => {
    const fixture = await seedCatalog();
    const snapshot = await offlineSnapshot([fixture.near, fixture.far]);

    const online = await rpcSearch(fixture.blockId, 10000, null);
    const offline = offlineSearch(snapshot, 10000, null);

    expect(offline.map((item) => item.id)).toEqual(
      online.map((row) => row.id),
    );
    expect(offline.map((item) => item.id)).toEqual([
      fixture.nearCheap,
      fixture.farCheap,
    ]);
    expect(offline.map((item) => item.name)).toEqual([
      "Cerca barato",
      "Lejos barato",
    ]);
  });

  it("aplica categoría y presupuesto con el mismo resultado", async () => {
    const fixture = await seedCatalog();
    const snapshot = await offlineSnapshot([fixture.near, fixture.far]);

    const online = await rpcSearch(fixture.blockId, 20000, "cafe");
    const offline = offlineSearch(snapshot, 20000, "cafe");

    expect(offline.map((item) => item.id)).toEqual(
      online.map((row) => row.id),
    );
    expect(offline.map((item) => item.id)).toEqual([fixture.farCheap]);
  });

  it("conserva el horario del establecimiento para 'abierto ahora'", async () => {
    const fixture = await seedCatalog();
    const snapshot = await offlineSnapshot([fixture.near, fixture.far]);

    const offline = offlineSearch(snapshot, 10000, null);
    const nearItem = offline.find((item) => item.id === fixture.nearCheap);
    expect(nearItem?.establishment_schedule).toEqual({
      mon: [["08:00", "17:00"]],
    });

    const online = await rpcSearch(fixture.blockId, 10000, null);
    const onlineNear = online.find((row) => row.id === fixture.nearCheap);
    expect(onlineNear?.establishment_schedule).toEqual(
      nearItem?.establishment_schedule,
    );
  });
});
