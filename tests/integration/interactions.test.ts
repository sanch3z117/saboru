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

async function createReviewFixture() {
  const authorId = await createStudent();
  const establishmentId = await insertEstablishment(client, {
    name: `Local ${randomUUID()}`,
  });
  const productId = await insertProduct(client, establishmentId);
  const review = await insertReview(client, {
    userId: authorId,
    establishmentId,
    productId,
  });

  return { authorId, establishmentId, productId, reviewId: review.id };
}

async function createReport(reporterId: string, reviewId: string) {
  return asAuthenticated(client, reporterId, () =>
    client.query<{ id: string }>(
      `insert into public.review_reports (client_id, review_id, reason)
       values ($1, $2, $3)
       returning id`,
      [randomUUID(), reviewId, "Contenido ofensivo"],
    ),
  );
}

describe("review_reports", () => {
  it("llena reporter_id con auth.uid() por defecto", async () => {
    const { reviewId } = await createReviewFixture();
    const reporterId = await createStudent();

    const inserted = await createReport(reporterId, reviewId);
    const report = await client.query<{ reporter_id: string; status: string }>(
      "select reporter_id, status from public.review_reports where id = $1",
      [inserted.rows[0]?.id],
    );

    expect(report.rows[0]?.reporter_id).toBe(reporterId);
    expect(report.rows[0]?.status).toBe("open");
  });

  it("el cliente no puede insertar reporter_id", async () => {
    const { reviewId } = await createReviewFixture();
    const reporterId = await createStudent();

    await expect(
      asAuthenticated(client, reporterId, () =>
        client.query(
          `insert into public.review_reports
             (client_id, review_id, reporter_id, reason)
           values ($1, $2, $3, $4)`,
          [randomUUID(), reviewId, reporterId, "Contenido ofensivo"],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("no permite reportar dos veces la misma reseña", async () => {
    const { reviewId } = await createReviewFixture();
    const reporterId = await createStudent();

    await createReport(reporterId, reviewId);

    await expect(createReport(reporterId, reviewId)).rejects.toThrow(
      /duplicate key|unique/i,
    );
  });

  it("no duplica con el mismo client_id", async () => {
    const first = await createReviewFixture();
    const second = await createReviewFixture();
    const reporterId = await createStudent();
    const clientId = randomUUID();

    await asAuthenticated(client, reporterId, () =>
      client.query(
        `insert into public.review_reports (client_id, review_id, reason)
         values ($1, $2, $3)`,
        [clientId, first.reviewId, "Spam"],
      ),
    );

    await expect(
      asAuthenticated(client, reporterId, () =>
        client.query(
          `insert into public.review_reports (client_id, review_id, reason)
           values ($1, $2, $3)`,
          [clientId, second.reviewId, "Spam"],
        ),
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rechaza un motivo vacío o mayor a 300 caracteres", async () => {
    const { reviewId } = await createReviewFixture();
    const reporterId = await createStudent();

    await expect(
      asAuthenticated(client, reporterId, () =>
        client.query(
          `insert into public.review_reports (client_id, review_id, reason)
           values ($1, $2, $3)`,
          [randomUUID(), reviewId, "   "],
        ),
      ),
    ).rejects.toThrow(/check constraint/);

    await expect(
      asAuthenticated(client, reporterId, () =>
        client.query(
          `insert into public.review_reports (client_id, review_id, reason)
           values ($1, $2, $3)`,
          [randomUUID(), reviewId, "a".repeat(301)],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("solo el autor del reporte y el admin pueden leerlo", async () => {
    const { reviewId } = await createReviewFixture();
    const reporterId = await createStudent();
    const otherStudent = await createStudent();
    const adminId = await createAdmin();

    await createReport(reporterId, reviewId);

    const own = await asAuthenticated(client, reporterId, () =>
      client.query<{ id: string }>("select id from public.review_reports"),
    );
    expect(own.rows).toHaveLength(1);

    const other = await asAuthenticated(client, otherStudent, () =>
      client.query<{ id: string }>("select id from public.review_reports"),
    );
    expect(other.rows).toHaveLength(0);

    const admin = await asAuthenticated(client, adminId, () =>
      client.query<{ id: string }>("select id from public.review_reports"),
    );
    expect(admin.rows).toHaveLength(1);
  });

  it("no permite UPDATE ni DELETE sobre reportes", async () => {
    const { reviewId } = await createReviewFixture();
    const reporterId = await createStudent();
    const inserted = await createReport(reporterId, reviewId);
    const reportId = inserted.rows[0]?.id;

    await expect(
      asAuthenticated(client, reporterId, () =>
        client.query(
          "update public.review_reports set reason = 'otro' where id = $1",
          [reportId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asAuthenticated(client, reporterId, () =>
        client.query("delete from public.review_reports where id = $1", [
          reportId,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("un vendedor con reportes antiguos no los ve ni los borra", async () => {
    const { reviewId } = await createReviewFixture();
    const reporterId = await createStudent();
    await createReport(reporterId, reviewId);

    await client.query(
      "update public.profiles set role = 'vendor' where id = $1",
      [reporterId],
    );

    const visible = await asAuthenticated(client, reporterId, () =>
      client.query<{ id: string }>("select id from public.review_reports"),
    );
    expect(visible.rows).toHaveLength(0);

    await expect(
      asAuthenticated(client, reporterId, () =>
        client.query("delete from public.review_reports"),
      ),
    ).rejects.toThrow(/permission denied/);

    const count = await client.query<CountRow>(
      "select count(*)::int as count from public.review_reports",
    );
    expect(count.rows[0]?.count).toBe(1);
  });

  it("un vendedor no puede crear reportes", async () => {
    const { reviewId } = await createReviewFixture();
    const vendorId = await insertAuthUser(
      client,
      `vendedor.${randomUUID()}@uptc.edu.co`,
    );
    await client.query(
      "update public.profiles set role = 'vendor' where id = $1",
      [vendorId],
    );

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          `insert into public.review_reports (client_id, review_id, reason)
           values ($1, $2, $3)`,
          [randomUUID(), reviewId, "Desde vendedor"],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("favorites", () => {
  it("llena user_id con auth.uid() por defecto", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);

    const inserted = await asAuthenticated(client, studentId, () =>
      client.query<{ id: string }>(
        `insert into public.favorites (establishment_id)
         values ($1)
         returning id`,
        [establishmentId],
      ),
    );

    const favorite = await client.query<{ user_id: string }>(
      "select user_id from public.favorites where id = $1",
      [inserted.rows[0]?.id],
    );
    expect(favorite.rows[0]?.user_id).toBe(studentId);
  });

  it("el cliente no puede insertar user_id", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          `insert into public.favorites (user_id, establishment_id)
           values ($1, $2)`,
          [studentId, establishmentId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("permite favorito de local sin producto y bloquea el duplicado", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);

    await asAuthenticated(client, studentId, () =>
      client.query(
        `insert into public.favorites (establishment_id, product_id)
         values ($1, null)`,
        [establishmentId],
      ),
    );

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          `insert into public.favorites (establishment_id, product_id)
           values ($1, null)`,
          [establishmentId],
        ),
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("bloquea un favorito de producto de otro local", async () => {
    const studentId = await createStudent();
    const establishmentA = await insertEstablishment(client);
    const establishmentB = await insertEstablishment(client);
    const productA = await insertProduct(client, establishmentA);

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          `insert into public.favorites (establishment_id, product_id)
           values ($1, $2)`,
          [establishmentB, productA],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("un estudiante no ve ni borra favoritos de otro", async () => {
    const ownerId = await createStudent();
    const otherId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const inserted = await asAuthenticated(client, ownerId, () =>
      client.query<{ id: string }>(
        `insert into public.favorites (establishment_id) values ($1) returning id`,
        [establishmentId],
      ),
    );

    const visible = await asAuthenticated(client, otherId, () =>
      client.query<{ id: string }>("select id from public.favorites"),
    );
    expect(visible.rows).toHaveLength(0);

    const removed = await asAuthenticated(client, otherId, () =>
      client.query("delete from public.favorites where id = $1", [
        inserted.rows[0]?.id,
      ]),
    );
    expect(removed.rowCount).toBe(0);

    const count = await client.query<CountRow>(
      "select count(*)::int as count from public.favorites",
    );
    expect(count.rows[0]?.count).toBe(1);
  });

  it("no permite UPDATE sobre favoritos", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const inserted = await asAuthenticated(client, studentId, () =>
      client.query<{ id: string }>(
        `insert into public.favorites (establishment_id) values ($1) returning id`,
        [establishmentId],
      ),
    );

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          "update public.favorites set product_id = null where id = $1",
          [inserted.rows[0]?.id],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("un vendedor con favoritos antiguos no los ve ni los borra", async () => {
    const studentId = await createStudent();
    const establishmentId = await insertEstablishment(client);
    const inserted = await asAuthenticated(client, studentId, () =>
      client.query<{ id: string }>(
        `insert into public.favorites (establishment_id) values ($1) returning id`,
        [establishmentId],
      ),
    );

    await client.query(
      "update public.profiles set role = 'vendor' where id = $1",
      [studentId],
    );

    const visible = await asAuthenticated(client, studentId, () =>
      client.query<{ id: string }>("select id from public.favorites"),
    );
    expect(visible.rows).toHaveLength(0);

    const removed = await asAuthenticated(client, studentId, () =>
      client.query("delete from public.favorites where id = $1", [
        inserted.rows[0]?.id,
      ]),
    );
    expect(removed.rowCount).toBe(0);

    const count = await client.query<CountRow>(
      "select count(*)::int as count from public.favorites",
    );
    expect(count.rows[0]?.count).toBe(1);
  });

  it("un vendedor no puede crear favoritos", async () => {
    const vendorId = await insertAuthUser(
      client,
      `vendedor.${randomUUID()}@uptc.edu.co`,
    );
    await client.query(
      "update public.profiles set role = 'vendor' where id = $1",
      [vendorId],
    );
    const establishmentId = await insertEstablishment(client);

    await expect(
      asAuthenticated(client, vendorId, () =>
        client.query(
          `insert into public.favorites (establishment_id) values ($1)`,
          [establishmentId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});
