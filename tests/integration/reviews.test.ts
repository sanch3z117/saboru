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

type ReviewRow = {
  id: string;
  status: string;
  comment: string | null;
  created_at: string;
};

type ProductStatsRow = {
  product_id: string;
  review_count: number;
  avg_sabor: string;
  avg_cantidad: string;
  avg_precio: string;
  avg_presentacion: string;
  avg_calidad_precio: string;
};

const ratingColumns =
  "rating_sabor, rating_cantidad, rating_precio, rating_presentacion, rating_calidad_precio";

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

async function insertReviewFixture(options: {
  userId: string;
  productId: string;
  establishmentId: string;
  clientId?: string;
  comment?: string | null;
  ratings?: [number, number, number, number, number];
}) {
  const id = randomUUID();
  const clientId = options.clientId ?? randomUUID();
  const ratings = options.ratings ?? [4, 4, 4, 4, 4];

  await client.query(
    `insert into public.reviews
       (id, client_id, user_id, product_id, establishment_id, ${ratingColumns}, comment)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      clientId,
      options.userId,
      options.productId,
      options.establishmentId,
      ...ratings,
      options.comment ?? "Rico",
    ],
  );

  return { id, clientId };
}

async function createStudentReview(
  studentId: string,
  productId: string,
  establishmentId: string,
  extra: { clientId?: string; comment?: string } = {},
) {
  return asAuthenticated(client, studentId, () =>
    client.query<{ id: string }>(
      `insert into public.reviews
         (client_id, user_id, product_id, establishment_id, ${ratingColumns}, comment)
       values ($1, $2, $3, $4, 4, 4, 4, 4, 4, $5)
       returning id`,
      [
        extra.clientId ?? randomUUID(),
        studentId,
        productId,
        establishmentId,
        extra.comment ?? "Rico",
      ],
    ),
  );
}

describe("reviews: inserción y estado", () => {
  it("el estudiante inserta sin status y queda published", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId);

    const result = await createStudentReview(
      studentId,
      productId,
      establishmentId,
    );
    const reviewId = result.rows[0]?.id;

    const review = await client.query<ReviewRow>(
      "select id, status, comment, created_at from public.reviews where id = $1",
      [reviewId],
    );
    expect(review.rows[0]?.status).toBe("published");
  });

  it("el estudiante no puede insertar status (columna no concedida)", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId);

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          `insert into public.reviews
             (client_id, user_id, product_id, establishment_id,
              rating_sabor, rating_cantidad, rating_precio,
              rating_presentacion, rating_calidad_precio, status)
           values ($1, $2, $3, $4, 5, 5, 5, 5, 5, 'hidden')`,
          [randomUUID(), studentId, productId, establishmentId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("el trigger fuerza published aunque se inserte hidden como postgres", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId);
    const reviewId = randomUUID();

    await client.query(
      `insert into public.reviews
         (id, client_id, user_id, product_id, establishment_id,
          ${ratingColumns}, status)
       values ($1, $2, $3, $4, $5, 3, 3, 3, 3, 3, 'hidden')`,
      [reviewId, randomUUID(), studentId, productId, establishmentId],
    );

    const review = await client.query<ReviewRow>(
      "select status from public.reviews where id = $1",
      [reviewId],
    );
    expect(review.rows[0]?.status).toBe("published");
  });

  it("el estudiante no puede cambiar el status de su reseña", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId);
    const { id } = await insertReviewFixture({
      userId: studentId,
      productId,
      establishmentId,
    });

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          "update public.reviews set status = 'hidden' where id = $1",
          [id],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("el estudiante no puede borrar reseñas", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId);
    const { id } = await insertReviewFixture({
      userId: studentId,
      productId,
      establishmentId,
    });

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query("delete from public.reviews where id = $1", [id]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("permite editar dentro de 30 días y bloquea después", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId);
    const { id } = await insertReviewFixture({
      userId: studentId,
      productId,
      establishmentId,
      comment: "Original",
    });

    await asAuthenticated(client, studentId, () =>
      client.query("update public.reviews set comment = $1 where id = $2", [
        "Editada",
        id,
      ]),
    );

    await client.query(
      "update public.reviews set created_at = now() - interval '31 days' where id = $1",
      [id],
    );

    const later = await asAuthenticated(client, studentId, () =>
      client.query("update public.reviews set comment = $1 where id = $2", [
        "Tarde",
        id,
      ]),
    );
    expect(later.rowCount).toBe(0);

    const review = await client.query<ReviewRow>(
      "select comment from public.reviews where id = $1",
      [id],
    );
    expect(review.rows[0]?.comment).toBe("Editada");
  });
});

describe("reviews: integridad y reglas", () => {
  it("rechaza establishment_id de otro local por la FK compuesta", async () => {
    const studentId = await createStudent();
    const establishmentA = await insertEstablishment(client, {
      name: "Local A",
    });
    const establishmentB = await insertEstablishment(client, {
      name: "Local B",
    });
    const productA = await insertProduct(client, establishmentA);

    await client.query("savepoint fk");
    // El trigger BEFORE INSERT valida disponibilidad antes de la FK; se
    // desactiva solo para aislar la restricción de integridad referencial.
    await client.query(
      "alter table public.reviews disable trigger reviews_enforce",
    );
    await expect(
      client.query(
        `insert into public.reviews
           (client_id, user_id, product_id, establishment_id, ${ratingColumns})
         values ($1, $2, $3, $4, 4, 4, 4, 4, 4)`,
        [randomUUID(), studentId, productA, establishmentB],
      ),
    ).rejects.toThrow(/foreign key/);
    await client.query("rollback to savepoint fk");
  });

  it("bloquea una segunda reseña del mismo producto en 30 días", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId);
    await insertReviewFixture({
      userId: studentId,
      productId,
      establishmentId,
    });

    await expect(
      createStudentReview(studentId, productId, establishmentId),
    ).rejects.toThrow(/review_cooldown/);

    await client.query("savepoint bypass");
    await expect(
      insertReviewFixture({
        userId: studentId,
        productId,
        establishmentId,
      }),
    ).rejects.toThrow(/review_cooldown/);
    await client.query("rollback to savepoint bypass");
  });

  it("no duplica con el mismo client_id", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productA = await insertProduct(client, establishmentId);
    const productB = await insertProduct(client, establishmentId);
    const clientId = randomUUID();

    await insertReviewFixture({
      userId: studentId,
      productId: productA,
      establishmentId,
      clientId,
    });

    await expect(
      insertReviewFixture({
        userId: studentId,
        productId: productB,
        establishmentId,
        clientId,
      }),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("el vendedor no puede insertar ni ver reseñas", async () => {
    const ownerId = await insertAuthUser(
      client,
      `vendedor.${randomUUID()}@uptc.edu.co`,
    );
    await client.query(
      "update public.profiles set role = 'vendor' where id = $1",
      [ownerId],
    );
    const establishmentId = await insertEstablishment(client, {
      ownerId,
    });
    const productId = await insertProduct(client, establishmentId);

    await expect(
      asAuthenticated(client, ownerId, () =>
        client.query(
          `insert into public.reviews
             (client_id, user_id, product_id, establishment_id, ${ratingColumns})
           values ($1, $2, $3, $4, 5, 5, 5, 5, 5)`,
          [randomUUID(), ownerId, productId, establishmentId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);

    const visible = await asAuthenticated(client, ownerId, () =>
      client.query<{ id: string }>("select id from public.reviews"),
    );
    expect(visible.rows).toHaveLength(0);
  });
});

describe("vistas públicas", () => {
  it("public_reviews no expone user_id ni client_id", async () => {
    const result = await client.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public' and table_name = 'public_reviews'`,
    );
    const columns = new Set(result.rows.map((row) => row.column_name));

    expect(columns.has("user_id")).toBe(false);
    expect(columns.has("client_id")).toBe(false);
    expect(columns.has("product_id")).toBe(true);
    expect(columns.has("comment")).toBe(true);
  });

  it("public_reviews solo muestra reseñas publicadas de locales activos", async () => {
    const studentId = await createStudent();
    const active = await insertEstablishment(client, { name: "Activo" });
    const activeProduct = await insertProduct(client, active);
    const hiddenProduct = await insertProduct(client, active);
    const published = await insertReviewFixture({
      userId: studentId,
      productId: activeProduct,
      establishmentId: active,
    });
    const hidden = await insertReviewFixture({
      userId: studentId,
      productId: hiddenProduct,
      establishmentId: active,
    });
    await client.query(
      "update public.reviews set status = 'hidden' where id = $1",
      [hidden.id],
    );

    const suspended = await insertEstablishment(client, {
      name: "Se suspende después",
    });
    const suspendedProduct = await insertProduct(client, suspended);
    await insertReviewFixture({
      userId: studentId,
      productId: suspendedProduct,
      establishmentId: suspended,
    });
    await client.query(
      "update public.establishments set status = 'suspended' where id = $1",
      [suspended],
    );

    const view = await asAnon(client, () =>
      client.query<{ id: string }>("select id from public.public_reviews"),
    );
    expect(view.rows.map((row) => row.id)).toEqual([published.id]);
  });

  it("product_stats calcula promedios exactos", async () => {
    const studentA = await createStudent();
    const studentB = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const productId = await insertProduct(client, establishmentId);

    await insertReviewFixture({
      userId: studentA,
      productId,
      establishmentId,
      ratings: [5, 4, 3, 2, 1],
    });
    await insertReviewFixture({
      userId: studentB,
      productId,
      establishmentId,
      ratings: [3, 3, 3, 3, 3],
    });

    const stats = await client.query<ProductStatsRow>(
      "select * from public.product_stats where product_id = $1",
      [productId],
    );
    const row = stats.rows[0];

    expect(row?.review_count).toBe(2);
    expect(Number(row?.avg_sabor)).toBe(4);
    expect(Number(row?.avg_cantidad)).toBe(3.5);
    expect(Number(row?.avg_precio)).toBe(3);
    expect(Number(row?.avg_presentacion)).toBe(2.5);
    expect(Number(row?.avg_calidad_precio)).toBe(2);
  });

  it("dos envíos simultáneos: solo una reseña pasa", async () => {
    const setup = createClient();
    const first = createClient();
    const second = createClient();
    await Promise.all([setup.connect(), first.connect(), second.connect()]);

    const suffix = randomUUID();
    const studentId = await insertAuthUser(
      setup,
      `concurrente.${suffix}@uptc.edu.co`,
    );
    const establishmentId = await insertEstablishment(setup, {
      name: `Concurrente ${suffix}`,
    });
    const productId = await insertProduct(setup, establishmentId);

    const insertSql = `
      insert into public.reviews
        (client_id, user_id, product_id, establishment_id, ${ratingColumns})
      values ($1, $2, $3, $4, 4, 4, 4, 4, 4)`;

    try {
      await first.query("begin");
      await second.query("begin");
      await first.query(insertSql, [
        randomUUID(),
        studentId,
        productId,
        establishmentId,
      ]);

      const concurrent = second
        .query(insertSql, [randomUUID(), studentId, productId, establishmentId])
        .then(
          () => null,
          (error: Error) => error,
        );

      await new Promise((resolve) => setTimeout(resolve, 150));
      await first.query("commit");

      const outcome = await concurrent;
      expect(outcome).toBeInstanceOf(Error);
      expect(outcome?.message).toMatch(/review_cooldown/);
      await second.query("rollback").catch(() => {});

      const count = await setup.query<CountRow>(
        "select count(*)::int as count from public.reviews where user_id = $1 and product_id = $2",
        [studentId, productId],
      );
      expect(count.rows[0]?.count).toBe(1);
    } finally {
      await setup.query("delete from public.reviews where user_id = $1", [
        studentId,
      ]);
      await setup.query(
        "delete from public.products where establishment_id = $1",
        [establishmentId],
      );
      await setup.query("delete from public.establishments where id = $1", [
        establishmentId,
      ]);
      await setup.query(
        "delete from public.vendor_invites where establishment_id = $1",
        [establishmentId],
      );
      await setup.query("delete from auth.users where id = $1", [studentId]);
      await Promise.all([setup.end(), first.end(), second.end()]);
    }
  });
});
