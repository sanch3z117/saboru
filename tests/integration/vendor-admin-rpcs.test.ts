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
  promoteToAdmin,
  type CountRow,
} from "./support";

let client: Client;

const BLOCK_CENTRAL = "00000000-0000-4000-8000-000000000001";

type StatsRow = {
  product_id: string;
  review_count: number;
  avg_sabor: string;
  avg_cantidad: string;
  avg_precio: string;
  avg_presentacion: string;
  avg_calidad_precio: string;
};

type CommentRow = {
  product_id: string;
  product_name: string;
  comment: string;
};

type TopRow = { product_id: string; name: string; view_count: number };
type ComparisonRow = {
  local_avg: string;
  campus_avg: string;
  local_review_count: number;
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

async function createStudent() {
  return insertAuthUser(client, `estudiante.${randomUUID()}@uptc.edu.co`);
}

async function createAdmin() {
  const id = await insertAuthUser(client, `admin.${randomUUID()}@uptc.edu.co`);
  await promoteToAdmin(client, id);
  return id;
}

async function createVendor(name = "Local del vendedor") {
  const vendorId = await insertAuthUser(
    client,
    `vendedor.${randomUUID()}@uptc.edu.co`,
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

async function addReviews(
  establishmentId: string,
  productId: string,
  options: {
    count: number;
    ratings?: [number, number, number, number, number];
    comment?: string;
    startAt?: number;
  },
) {
  const created: string[] = [];
  const ratings = options.ratings ?? [5, 4, 3, 2, 1];

  for (let index = 0; index < options.count; index += 1) {
    const studentId = await createStudent();
    const review = await insertReview(client, {
      userId: studentId,
      establishmentId,
      productId,
      ratings,
      comment:
        options.comment === undefined
          ? `Comentario ${index + 1}`
          : `${options.comment} ${index + 1}`,
    });
    created.push(review.id);
  }

  return created;
}

function callVendorRpc(
  userId: string,
  fn:
    | "vendor_product_stats"
    | "vendor_top_products"
    | "vendor_views_by_hour"
    | "vendor_campus_comparison"
    | "vendor_recent_comments",
  establishmentId: string,
) {
  return asAuthenticated(client, userId, () =>
    client.query(`select * from public.${fn}($1::uuid)`, [establishmentId]),
  );
}

describe("acceso a las RPC", () => {
  it("anon no puede ejecutar RPC de vendedor ni de admin", async () => {
    for (const fn of [
      "vendor_product_stats",
      "vendor_top_products",
      "vendor_views_by_hour",
      "vendor_campus_comparison",
      "vendor_recent_comments",
    ]) {
      await expect(
        asAnon(client, () =>
          client.query(`select * from public.${fn}($1::uuid)`, [randomUUID()]),
        ),
      ).rejects.toThrow(/permission denied/);
    }

    await expect(
      asAnon(client, () =>
        client.query(
          "select public.admin_set_review_status($1::uuid, $2::public.review_status)",
          [randomUUID(), "published"],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asAnon(client, () =>
        client.query(
          "select public.admin_create_vendor_invite($1::text, $2::uuid)",
          ["x@example.com", randomUUID()],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asAnon(client, () =>
        client.query(
          `select public.admin_create_establishment(
             $1::text, $2::text, $3::text, $4::text, $5::uuid,
             $6::double precision, $7::double precision, $8::text, $9::jsonb
           )`,
          [
            "Local anónimo",
            `anon-${randomUUID()}`,
            "",
            "",
            BLOCK_CENTRAL,
            5.552,
            -73.3567,
            "almuerzos",
            JSON.stringify({}),
          ],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("un vendedor no puede ejecutar RPC de admin", async () => {
    const { vendorId, establishmentId } = await createVendor();

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          "select public.admin_set_review_status($1::uuid, $2::public.review_status)",
          [randomUUID(), "published"],
        ),
      ),
    ).rejects.toThrow(/forbidden/);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          "select public.admin_resolve_report($1::uuid, $2::public.report_status)",
          [randomUUID(), "reviewed"],
        ),
      ),
    ).rejects.toThrow(/forbidden/);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          "select public.admin_set_establishment_status($1::uuid, $2::public.establishment_status)",
          [establishmentId, "active"],
        ),
      ),
    ).rejects.toThrow(/forbidden/);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          "select public.admin_set_establishment_plan($1::uuid, $2::public.establishment_plan)",
          [establishmentId, "pro"],
        ),
      ),
    ).rejects.toThrow(/forbidden/);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          "select public.admin_create_vendor_invite($1::text, $2::uuid)",
          ["nuevo@example.com", establishmentId],
        ),
      ),
    ).rejects.toThrow(/forbidden/);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          `select public.admin_create_establishment(
             $1::text, $2::text, $3::text, $4::text, $5::uuid,
             $6::double precision, $7::double precision, $8::text, $9::jsonb
           )`,
          [
            "Local del vendedor",
            `vendor-${randomUUID()}`,
            "",
            "",
            BLOCK_CENTRAL,
            5.552,
            -73.3567,
            "almuerzos",
            JSON.stringify({}),
          ],
        ),
      ),
    ).rejects.toThrow(/forbidden/);
  });

  it("un vendedor con el local de otro recibe forbidden en las 5 RPC", async () => {
    const owner = await createVendor("Dueño");
    const intruder = await createVendor("Intruso");

    for (const fn of [
      "vendor_product_stats",
      "vendor_top_products",
      "vendor_views_by_hour",
      "vendor_campus_comparison",
      "vendor_recent_comments",
    ] as const) {
      await expect(
        callVendorRpc(intruder.vendorId, fn, owner.establishmentId),
      ).rejects.toThrow(/forbidden/);
    }
  });

  it("un vendedor no tiene acceso directo a las tablas sensibles", async () => {
    const { vendorId } = await createVendor();

    for (const table of ["reviews", "review_reports"]) {
      const result = await asAuthenticated(client, vendorId, () =>
        client.query(`select 1 from public.${table}`),
      );
      expect(result.rows).toHaveLength(0);
    }

    for (const table of ["search_events", "product_views"]) {
      await expect(
        asAuthenticated(client, vendorId, () =>
          client.query(`select 1 from public.${table}`),
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe("estadísticas del vendedor", () => {
  it("con menos de 5 reseñas no devuelve promedios ni comentarios", async () => {
    const { vendorId, establishmentId } = await createVendor();
    const productId = await insertProduct(client, establishmentId);
    await addReviews(establishmentId, productId, { count: 4 });

    const stats = await callVendorRpc(
      vendorId,
      "vendor_product_stats",
      establishmentId,
    );
    expect(stats.rows).toHaveLength(0);

    const comparison = await callVendorRpc(
      vendorId,
      "vendor_campus_comparison",
      establishmentId,
    );
    expect(comparison.rows).toHaveLength(0);

    const comments = await callVendorRpc(
      vendorId,
      "vendor_recent_comments",
      establishmentId,
    );
    expect(comments.rows).toHaveLength(0);
  });

  it("con 5 reseñas devuelve promedios, comparación y comentarios sin ids de autor", async () => {
    const { vendorId, establishmentId } = await createVendor();
    const productId = await insertProduct(client, establishmentId);
    await addReviews(establishmentId, productId, { count: 5 });

    const stats = await callVendorRpc(
      vendorId,
      "vendor_product_stats",
      establishmentId,
    );
    const row = stats.rows[0] as StatsRow | undefined;
    expect(row?.review_count).toBe(5);
    expect(Number(row?.avg_sabor)).toBe(5);
    expect(Number(row?.avg_cantidad)).toBe(4);
    expect(Number(row?.avg_precio)).toBe(3);
    expect(Number(row?.avg_presentacion)).toBe(2);
    expect(Number(row?.avg_calidad_precio)).toBe(1);

    const comparison = await callVendorRpc(
      vendorId,
      "vendor_campus_comparison",
      establishmentId,
    );
    const comparisonRow = comparison.rows[0] as ComparisonRow | undefined;
    expect(Number(comparisonRow?.local_avg)).toBe(3);
    expect(Number(comparisonRow?.campus_avg)).toBe(3);
    expect(comparisonRow?.local_review_count).toBe(5);

    const comments = await callVendorRpc(
      vendorId,
      "vendor_recent_comments",
      establishmentId,
    );
    expect(comments.rows).toHaveLength(5);
    const commentRow = comments.rows[0] as CommentRow;
    expect(Object.keys(commentRow)).not.toContain("user_id");
    expect(Object.keys(commentRow)).not.toContain("reporter_id");
    expect(commentRow.product_id).toBe(productId);
    expect(commentRow.product_name).toContain("Producto");
  });

  it("comentarios: filtra vacíos y ocultos y limita a 10", async () => {
    const { vendorId, establishmentId } = await createVendor();
    const productId = await insertProduct(client, establishmentId);
    const reviewIds = await addReviews(establishmentId, productId, {
      count: 12,
    });

    await client.query(
      "update public.reviews set comment = '   ' where id = $1",
      [reviewIds[0]],
    );
    await client.query(
      "update public.reviews set status = 'hidden' where id = $1",
      [reviewIds[1]],
    );

    const comments = await callVendorRpc(
      vendorId,
      "vendor_recent_comments",
      establishmentId,
    );
    expect(comments.rows).toHaveLength(10);
    for (const row of comments.rows as CommentRow[]) {
      expect(row.comment.trim().length).toBeGreaterThan(0);
    }
  });

  it("top products se limita a 10 y solo cuenta el local propio", async () => {
    const owner = await createVendor("Dueño top");
    const other = await createVendor("Otro local");

    for (let index = 0; index < 12; index += 1) {
      const productId = await insertProduct(client, owner.establishmentId, {
        name: `Producto ${index}`,
      });
      await client.query(
        "insert into public.product_views (product_id) values ($1)",
        [productId],
      );
    }

    const otherProduct = await insertProduct(client, other.establishmentId);
    for (let index = 0; index < 50; index += 1) {
      await client.query(
        "insert into public.product_views (product_id) values ($1)",
        [otherProduct],
      );
    }

    const top = await callVendorRpc(
      owner.vendorId,
      "vendor_top_products",
      owner.establishmentId,
    );
    expect(top.rows).toHaveLength(10);
    for (const row of top.rows as TopRow[]) {
      expect(row.product_id).not.toBe(otherProduct);
    }
  });

  it("vistas por hora usa America/Bogota", async () => {
    const { vendorId, establishmentId } = await createVendor();
    const productId = await insertProduct(client, establishmentId);

    for (let index = 0; index < 2; index += 1) {
      await client.query(
        `insert into public.product_views (product_id, created_at)
         values ($1, '2026-01-15T15:00:00Z')`,
        [productId],
      );
    }
    await client.query(
      `insert into public.product_views (product_id, created_at)
       values ($1, '2026-01-15T16:00:00Z')`,
      [productId],
    );

    const hours = await callVendorRpc(
      vendorId,
      "vendor_views_by_hour",
      establishmentId,
    );
    expect(hours.rows).toEqual([
      { hour: 10, view_count: 2 },
      { hour: 11, view_count: 1 },
    ]);
  });
});

describe("RPC de admin", () => {
  it("cambiar el estado de una reseña afecta promedios y vista pública", async () => {
    const adminId = await createAdmin();
    const { vendorId, establishmentId } = await createVendor();
    const productId = await insertProduct(client, establishmentId);
    const reviewIds = await addReviews(establishmentId, productId, {
      count: 5,
    });

    await asAuthenticated(client, adminId, () =>
      client.query(
        "select public.admin_set_review_status($1::uuid, $2::public.review_status)",
        [reviewIds[0], "hidden"],
      ),
    );

    const publicReviews = await client.query<CountRow>(
      "select count(*)::int as count from public.public_reviews where product_id = $1",
      [productId],
    );
    expect(publicReviews.rows[0]?.count).toBe(4);

    const stats = await callVendorRpc(
      vendorId,
      "vendor_product_stats",
      establishmentId,
    );
    expect(stats.rows).toHaveLength(0);
  });

  it("resuelve reportes y actualiza estado/plan del local", async () => {
    const adminId = await createAdmin();
    const { establishmentId } = await createVendor();
    const productId = await insertProduct(client, establishmentId);
    const reviewIds = await addReviews(establishmentId, productId, {
      count: 5,
    });
    const reporterId = await createStudent();

    const report = await asAuthenticated(client, reporterId, () =>
      client.query<{ id: string }>(
        `insert into public.review_reports (client_id, review_id, reason)
         values ($1, $2, $3) returning id`,
        [randomUUID(), reviewIds[0], "Spam"],
      ),
    );
    const reportId = report.rows[0]?.id;

    await asAuthenticated(client, adminId, () =>
      client.query(
        "select public.admin_resolve_report($1::uuid, $2::public.report_status)",
        [reportId, "reviewed"],
      ),
    );

    const resolved = await client.query<{ status: string }>(
      "select status from public.review_reports where id = $1",
      [reportId],
    );
    expect(resolved.rows[0]?.status).toBe("reviewed");

    await asAuthenticated(client, adminId, () =>
      client.query(
        "select public.admin_set_establishment_status($1::uuid, $2::public.establishment_status)",
        [establishmentId, "suspended"],
      ),
    );
    await asAuthenticated(client, adminId, () =>
      client.query(
        "select public.admin_set_establishment_plan($1::uuid, $2::public.establishment_plan)",
        [establishmentId, "pro"],
      ),
    );

    const establishment = await client.query<{
      status: string;
      plan: string;
    }>("select status, plan from public.establishments where id = $1", [
      establishmentId,
    ]);
    expect(establishment.rows[0]).toEqual({ status: "suspended", plan: "pro" });
  });

  it("crea invitaciones con validaciones", async () => {
    const adminId = await createAdmin();
    const establishmentId = await insertEstablishment(client, {
      name: "Local sin dueño",
    });

    const created = await asAuthenticated(client, adminId, () =>
      client.query<{ id: string }>(
        "select public.admin_create_vendor_invite($1::text, $2::uuid) as id",
        ["  Nuevo.Vendedor@Example.COM ", establishmentId],
      ),
    );

    const invite = await client.query<{
      email: string;
      invited_by: string;
    }>("select email, invited_by from public.vendor_invites where id = $1", [
      created.rows[0]?.id,
    ]);
    expect(invite.rows[0]).toEqual({
      email: "nuevo.vendedor@example.com",
      invited_by: adminId,
    });

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          "select public.admin_create_vendor_invite($1::text, $2::uuid)",
          ["nuevo.vendedor@example.com", establishmentId],
        ),
      ),
    ).rejects.toThrow(/invite_exists/);

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          "select public.admin_create_vendor_invite($1::text, $2::uuid)",
          ["sin-arroba", establishmentId],
        ),
      ),
    ).rejects.toThrow(/invalid_email/);

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          "select public.admin_create_vendor_invite($1::text, $2::uuid)",
          ["otro@example.com", randomUUID()],
        ),
      ),
    ).rejects.toThrow(/establishment_not_found/);

    const owned = await createVendor("Con dueño");
    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          "select public.admin_create_vendor_invite($1::text, $2::uuid)",
          ["otro@example.com", owned.establishmentId],
        ),
      ),
    ).rejects.toThrow(/establishment_has_owner/);

    const registered = await createStudent();
    const registeredEmail = (
      await client.query<{ email: string }>(
        "select email from public.profiles where id = $1",
        [registered],
      )
    ).rows[0]?.email;

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          "select public.admin_create_vendor_invite($1::text, $2::uuid)",
          [registeredEmail, establishmentId],
        ),
      ),
    ).rejects.toThrow(/email_already_registered/);
  });

  it("devuelve not_found en ids inexistentes", async () => {
    const adminId = await createAdmin();

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          "select public.admin_set_review_status($1::uuid, $2::public.review_status)",
          [randomUUID(), "hidden"],
        ),
      ),
    ).rejects.toThrow(/review_not_found/);

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          "select public.admin_resolve_report($1::uuid, $2::public.report_status)",
          [randomUUID(), "dismissed"],
        ),
      ),
    ).rejects.toThrow(/report_not_found/);

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          "select public.admin_set_establishment_status($1::uuid, $2::public.establishment_status)",
          [randomUUID(), "active"],
        ),
      ),
    ).rejects.toThrow(/establishment_not_found/);
  });

  it("cambiar el plan no altera promedios ni el orden de búsqueda", async () => {
    const adminId = await createAdmin();
    const { vendorId, establishmentId } = await createVendor();
    const cheap = await insertProduct(client, establishmentId, {
      name: "Barato",
      price: 5000,
    });
    await insertProduct(client, establishmentId, {
      name: "Caro",
      price: 9000,
    });
    await addReviews(establishmentId, cheap, { count: 5 });

    const statsBefore = await callVendorRpc(
      vendorId,
      "vendor_product_stats",
      establishmentId,
    );
    const searchBefore = await client.query<{ id: string }>(
      "select id from public.search_products(null, $1::uuid, 5000, null)",
      [BLOCK_CENTRAL],
    );

    await asAuthenticated(client, adminId, () =>
      client.query(
        "select public.admin_set_establishment_plan($1::uuid, $2::public.establishment_plan)",
        [establishmentId, "pro"],
      ),
    );

    const statsAfter = await callVendorRpc(
      vendorId,
      "vendor_product_stats",
      establishmentId,
    );
    const searchAfter = await client.query<{ id: string }>(
      "select id from public.search_products(null, $1::uuid, 5000, null)",
      [BLOCK_CENTRAL],
    );

    expect(statsAfter.rows).toEqual(statsBefore.rows);
    expect(searchAfter.rows.map((row) => row.id)).toEqual(
      searchBefore.rows.map((row) => row.id),
    );
  });
});

describe("admin_create_establishment", () => {
  it("crea un local en borrador con ubicaci�n, horario y plan b�sico", async () => {
    const adminId = await createAdmin();
    const slug = `nuevo-local-${randomUUID()}`;
    const schedule = { mon: [["08:00", "17:00"]], tue: [] };

    const created = await asAuthenticated(client, adminId, () =>
      client.query<{ id: string }>(
        `select public.admin_create_establishment(
           $1::text, $2::text, $3::text, $4::text, $5::uuid,
           $6::double precision, $7::double precision, $8::text, $9::jsonb
         ) as id`,
        [
          "Cafeter�a Nueva",
          slug,
          "Caf� y panader�a",
          "Bloque Central",
          BLOCK_CENTRAL,
          5.553,
          -73.357,
          "caf�",
          JSON.stringify(schedule),
        ],
      ),
    );
    const id = created.rows[0]?.id;

    const result = await client.query<{
      name: string;
      slug: string;
      description: string;
      address: string;
      category: string;
      status: string;
      plan: string;
      owner_id: string | null;
      schedule: typeof schedule;
      lat: number;
      lng: number;
    }>(
      `select name, slug, description, address, category, status, plan,
              owner_id, schedule,
              extensions.st_y(location::extensions.geometry) as lat,
              extensions.st_x(location::extensions.geometry) as lng
         from public.establishments
        where id = $1`,
      [id],
    );

    const row = result.rows[0];
    expect(row?.name).toBe("Cafeter�a Nueva");
    expect(row?.slug).toBe(slug);
    expect(row?.description).toBe("Caf� y panader�a");
    expect(row?.address).toBe("Bloque Central");
    expect(row?.category).toBe("caf�");
    expect(row?.status).toBe("draft");
    expect(row?.plan).toBe("basic");
    expect(row?.owner_id).toBeNull();
    expect(row?.schedule).toEqual(schedule);
    expect(row?.lat).toBeCloseTo(5.553);
    expect(row?.lng).toBeCloseTo(-73.357);
  });

  it("rechaza slug duplicado, bloque, coordenadas y horario inv�lidos", async () => {
    const adminId = await createAdmin();
    const slug = `duplicado-${randomUUID()}`;

    await asAuthenticated(client, adminId, () =>
      client.query(
        `select public.admin_create_establishment(
           $1::text, $2::text, $3::text, $4::text, $5::uuid,
           $6::double precision, $7::double precision, $8::text, $9::jsonb
         )`,
        [
          "Primero",
          slug,
          "",
          "",
          BLOCK_CENTRAL,
          5.552,
          -73.3567,
          "almuerzos",
          JSON.stringify({}),
        ],
      ),
    );

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          `select public.admin_create_establishment(
             $1::text, $2::text, $3::text, $4::text, $5::uuid,
             $6::double precision, $7::double precision, $8::text, $9::jsonb
           )`,
          [
            "Segundo",
            slug,
            "",
            "",
            BLOCK_CENTRAL,
            5.552,
            -73.3567,
            "almuerzos",
            JSON.stringify({}),
          ],
        ),
      ),
    ).rejects.toThrow(/slug_exists/);

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          `select public.admin_create_establishment(
             $1::text, $2::text, $3::text, $4::text, $5::uuid,
             $6::double precision, $7::double precision, $8::text, $9::jsonb
           )`,
          [
            "Sin bloque",
            `sin-bloque-${randomUUID()}`,
            "",
            "",
            randomUUID(),
            5.552,
            -73.3567,
            "almuerzos",
            JSON.stringify({}),
          ],
        ),
      ),
    ).rejects.toThrow(/invalid_block/);

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          `select public.admin_create_establishment(
             $1::text, $2::text, $3::text, $4::text, $5::uuid,
             $6::double precision, $7::double precision, $8::text, $9::jsonb
           )`,
          [
            "Coordenadas",
            `coordenadas-${randomUUID()}`,
            "",
            "",
            BLOCK_CENTRAL,
            95,
            -73.3567,
            "almuerzos",
            JSON.stringify({}),
          ],
        ),
      ),
    ).rejects.toThrow(/invalid_coordinates/);

    await expect(
      asAuthenticated(client, adminId, () =>
        client.query(
          `select public.admin_create_establishment(
             $1::text, $2::text, $3::text, $4::text, $5::uuid,
             $6::double precision, $7::double precision, $8::text, $9::jsonb
           )`,
          [
            "Horario",
            `horario-${randomUUID()}`,
            "",
            "",
            BLOCK_CENTRAL,
            5.552,
            -73.3567,
            "almuerzos",
            JSON.stringify([]),
          ],
        ),
      ),
    ).rejects.toThrow(/invalid_schedule/);
  });
});
