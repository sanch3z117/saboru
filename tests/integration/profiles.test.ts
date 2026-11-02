import { randomUUID } from "node:crypto";

import { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

const connectionString =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let client: Client;

type ProfileRow = {
  id: string;
  role: string;
  email: string;
  full_name: string;
};

type InviteRow = {
  email: string;
  accepted_at: string | null;
  accepted_by: string | null;
};

type CountRow = { count: number };
type BooleanRow = { value: boolean };

beforeAll(async () => {
  client = new Client({ connectionString });
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

async function insertAuthUser(
  email: string,
  options: { confirmed?: boolean; fullName?: string } = {},
) {
  const id = randomUUID();

  await client.query(
    `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
     values ($1, $2, $3, jsonb_build_object('full_name', $4::text))`,
    [
      id,
      email,
      options.confirmed === false ? null : new Date().toISOString(),
      options.fullName ?? "Persona de prueba",
    ],
  );

  return id;
}

async function getProfile(id: string) {
  const result = await client.query<ProfileRow>(
    "select id, role, email, full_name from public.profiles where id = $1",
    [id],
  );

  return result.rows[0];
}

async function countProfiles(email: string) {
  const result = await client.query<CountRow>(
    "select count(*)::int as count from public.profiles where email = $1",
    [email],
  );

  return result.rows[0]?.count;
}

/**
 * Ejecuta una consulta como el rol `authenticated` con el JWT simulado de
 * PostgREST. Si la consulta falla, revierte al savepoint para que la
 * transacción de la prueba siga viva.
 */
async function asAuthenticated<T>(
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query("savepoint as_authenticated");
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
    userId,
  ]);

  try {
    const result = await fn();
    await clearAuthContext();
    return result;
  } catch (error) {
    await client.query("rollback to savepoint as_authenticated");
    await clearAuthContext();
    throw error;
  }
}

async function clearAuthContext() {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claims', '', true)");
  await client.query("select set_config('request.jwt.claim.sub', '', true)");
}

async function promoteToAdmin(id: string) {
  await client.query(
    "update public.profiles set role = 'admin' where id = $1",
    [id],
  );
}

describe("registro y dominio institucional", () => {
  it("rechaza un correo no institucional sin invitación y no deja filas", async () => {
    const email = "persona@gmail.com";

    await client.query("savepoint signup");
    await expect(insertAuthUser(email)).rejects.toThrow(
      /email_domain_not_allowed/,
    );
    await client.query("rollback to savepoint signup");

    const users = await client.query<CountRow>(
      "select count(*)::int as count from auth.users where lower(email) = $1",
      [email],
    );
    expect(users.rows[0]?.count).toBe(0);
    expect(await countProfiles(email)).toBe(0);
  });

  it("normaliza a minúsculas un correo institucional en mayúsculas", async () => {
    const id = await insertAuthUser("Estudiante.Mayus@UPTC.EDU.CO");
    const profile = await getProfile(id);

    expect(profile?.role).toBe("student");
    expect(profile?.email).toBe("estudiante.mayus@uptc.edu.co");
  });

  it("acepta una invitación y crea el perfil vendor, no student", async () => {
    const adminId = await insertAuthUser("admin@uptc.edu.co");
    await promoteToAdmin(adminId);

    const vendorEmail = "vendedor@example.com";
    await asAuthenticated(adminId, () =>
      client.query(
        `insert into public.vendor_invites (email, establishment_id, invited_by)
         values ($1, $2, $3)`,
        [vendorEmail, randomUUID(), adminId],
      ),
    );

    const vendorId = await insertAuthUser(vendorEmail);
    const profile = await getProfile(vendorId);

    expect(profile?.role).toBe("vendor");
    expect(profile?.email).toBe(vendorEmail);

    const invite = await client.query<InviteRow>(
      `select email, accepted_at, accepted_by
       from public.vendor_invites
       where lower(email) = $1`,
      [vendorEmail],
    );

    expect(invite.rows[0]?.accepted_at).not.toBeNull();
    expect(invite.rows[0]?.accepted_by).toBe(vendorId);
    expect(await countProfiles(vendorEmail)).toBe(1);

    const studentRows = await client.query<CountRow>(
      "select count(*)::int as count from public.profiles where id = $1 and role = 'student'",
      [vendorId],
    );
    expect(studentRows.rows[0]?.count).toBe(0);
  });
});

describe("permisos del perfil", () => {
  it("el estudiante no puede cambiar su role ni su email", async () => {
    const studentId = await insertAuthUser("estudiante1@uptc.edu.co");
    const before = await getProfile(studentId);

    await expect(
      asAuthenticated(studentId, () =>
        client.query(
          "update public.profiles set role = 'admin' where id = $1",
          [studentId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asAuthenticated(studentId, () =>
        client.query(
          "update public.profiles set email = 'otro@uptc.edu.co' where id = $1",
          [studentId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    expect(await getProfile(studentId)).toEqual(before);
  });

  it("el estudiante sí puede cambiar su full_name", async () => {
    const studentId = await insertAuthUser("estudiante2@uptc.edu.co", {
      fullName: "Nombre anterior",
    });

    await asAuthenticated(studentId, () =>
      client.query("update public.profiles set full_name = $1 where id = $2", [
        "Nombre nuevo",
        studentId,
      ]),
    );

    const profile = await getProfile(studentId);
    expect(profile?.full_name).toBe("Nombre nuevo");
  });

  it("el estudiante solo ve su propio perfil y el admin ve todos", async () => {
    const studentA = await insertAuthUser("visible.a@uptc.edu.co");
    const studentB = await insertAuthUser("visible.b@uptc.edu.co");
    const adminId = await insertAuthUser("admin.visible@uptc.edu.co");
    await promoteToAdmin(adminId);

    const ownView = await asAuthenticated(studentA, () =>
      client.query<ProfileRow>(
        "select id, role, email, full_name from public.profiles",
      ),
    );
    expect(ownView.rows.map((row) => row.id)).toEqual([studentA]);

    const adminView = await asAuthenticated(adminId, () =>
      client.query<ProfileRow>(
        "select id, role, email, full_name from public.profiles",
      ),
    );
    expect(new Set(adminView.rows.map((row) => row.id))).toEqual(
      new Set([studentA, studentB, adminId]),
    );
  });

  it("solo el admin puede ver y crear invitaciones", async () => {
    const adminId = await insertAuthUser("admin2@uptc.edu.co");
    await promoteToAdmin(adminId);
    const studentId = await insertAuthUser("estudiante3@uptc.edu.co");
    const establishmentId = randomUUID();

    await asAuthenticated(adminId, () =>
      client.query(
        `insert into public.vendor_invites (email, establishment_id, invited_by)
         values ($1, $2, $3)`,
        ["invitado@example.com", establishmentId, adminId],
      ),
    );

    const adminView = await asAuthenticated(adminId, () =>
      client.query<InviteRow>(
        "select email, accepted_at, accepted_by from public.vendor_invites",
      ),
    );
    expect(adminView.rows).toHaveLength(1);

    const studentView = await asAuthenticated(studentId, () =>
      client.query<InviteRow>(
        "select email, accepted_at, accepted_by from public.vendor_invites",
      ),
    );
    expect(studentView.rows).toHaveLength(0);

    await expect(
      asAuthenticated(studentId, () =>
        client.query(
          `insert into public.vendor_invites (email, establishment_id, invited_by)
           values ($1, $2, $3)`,
          ["otro@example.com", randomUUID(), studentId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("no permite dos invitaciones abiertas para el mismo correo", async () => {
    const adminId = await insertAuthUser("admin3@uptc.edu.co");
    await promoteToAdmin(adminId);

    const invite = () =>
      asAuthenticated(adminId, () =>
        client.query(
          `insert into public.vendor_invites (email, establishment_id, invited_by)
           values ($1, $2, $3)`,
          ["duplicado@example.com", randomUUID(), adminId],
        ),
      );

    await invite();
    await expect(invite()).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("is_institutional_student", () => {
  it("exige rol student, correo confirmado y dominio permitido", async () => {
    const confirmed = await insertAuthUser("confirmado@uptc.edu.co");
    const confirmedResult = await asAuthenticated(confirmed, () =>
      client.query<BooleanRow>(
        "select public.is_institutional_student() as value",
      ),
    );
    expect(confirmedResult.rows[0]?.value).toBe(true);

    const unconfirmed = await insertAuthUser("sin.confirmar@uptc.edu.co", {
      confirmed: false,
    });
    const unconfirmedResult = await asAuthenticated(unconfirmed, () =>
      client.query<BooleanRow>(
        "select public.is_institutional_student() as value",
      ),
    );
    expect(unconfirmedResult.rows[0]?.value).toBe(false);
  });
});
