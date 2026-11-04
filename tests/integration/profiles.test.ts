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

import { PRIVACY_VERSION } from "../../src/lib/auth/privacy";
import {
  asAuthenticated,
  countProfiles,
  createClient,
  getProfile,
  insertAuthUser,
  insertEstablishment,
  promoteToAdmin,
  type BooleanRow,
  type CountRow,
} from "./support";

let client: Client;

type InviteRow = {
  email: string;
  accepted_at: string | null;
  accepted_by: string | null;
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

describe("registro y dominio institucional", () => {
  it("rechaza un correo no institucional sin invitación y no deja filas", async () => {
    const email = "persona@gmail.com";

    await client.query("savepoint signup");
    await expect(insertAuthUser(client, email)).rejects.toThrow(
      /email_domain_not_allowed/,
    );
    await client.query("rollback to savepoint signup");

    const users = await client.query<CountRow>(
      "select count(*)::int as count from auth.users where lower(email) = $1",
      [email],
    );
    expect(users.rows[0]?.count).toBe(0);
    expect(await countProfiles(client, email)).toBe(0);
  });

  it("normaliza a minúsculas un correo institucional en mayúsculas", async () => {
    const id = await insertAuthUser(client, "Estudiante.Mayus@UPTC.EDU.CO");
    const profile = await getProfile(client, id);

    expect(profile?.role).toBe("student");
    expect(profile?.email).toBe("estudiante.mayus@uptc.edu.co");
  });

  it("copia la aceptación y la versión de privacidad al perfil nuevo", async () => {
    const acceptedAt = "2026-11-03T15:30:00.000Z";
    const id = await insertAuthUser(client, "consentimiento@uptc.edu.co", {
      privacyAcceptedAt: acceptedAt,
      privacyVersion: PRIVACY_VERSION,
    });

    const result = await client.query<{
      privacy_accepted_at: string | null;
      privacy_version: string | null;
    }>(
      `select privacy_accepted_at, privacy_version
       from public.profiles
       where id = $1`,
      [id],
    );

    expect(result.rows[0]?.privacy_accepted_at).not.toBeNull();
    expect(
      new Date(result.rows[0]?.privacy_accepted_at ?? "").toISOString(),
    ).toBe(acceptedAt);
    expect(result.rows[0]?.privacy_version).toBe(PRIVACY_VERSION);
  });

  it("acepta una invitación y crea el perfil vendor, no student", async () => {
    const adminId = await insertAuthUser(client, "admin@uptc.edu.co");
    await promoteToAdmin(client, adminId);

    const vendorEmail = "vendedor@example.com";
    const establishmentId = await insertEstablishment(client, {
      name: "Local de la invitación",
    });
    await asAuthenticated(client, adminId, () =>
      client.query(
        `insert into public.vendor_invites (email, establishment_id, invited_by)
         values ($1, $2, $3)`,
        [vendorEmail, establishmentId, adminId],
      ),
    );

    const acceptedAt = "2026-11-03T16:00:00.000Z";
    const vendorId = await insertAuthUser(client, vendorEmail, {
      privacyAcceptedAt: acceptedAt,
      privacyVersion: PRIVACY_VERSION,
    });
    const profile = await getProfile(client, vendorId);

    expect(profile?.role).toBe("vendor");
    expect(profile?.email).toBe(vendorEmail);

    const privacy = await client.query<{
      privacy_accepted_at: string | null;
      privacy_version: string | null;
    }>(
      `select privacy_accepted_at, privacy_version
       from public.profiles
       where id = $1`,
      [vendorId],
    );
    expect(privacy.rows[0]?.privacy_version).toBe(PRIVACY_VERSION);
    expect(privacy.rows[0]?.privacy_accepted_at).not.toBeNull();

    const invite = await client.query<InviteRow>(
      `select email, accepted_at, accepted_by
       from public.vendor_invites
       where lower(email) = $1`,
      [vendorEmail],
    );

    expect(invite.rows[0]?.accepted_at).not.toBeNull();
    expect(invite.rows[0]?.accepted_by).toBe(vendorId);
    expect(await countProfiles(client, vendorEmail)).toBe(1);

    const studentRows = await client.query<CountRow>(
      "select count(*)::int as count from public.profiles where id = $1 and role = 'student'",
      [vendorId],
    );
    expect(studentRows.rows[0]?.count).toBe(0);
  });
});

describe("permisos del perfil", () => {
  it("el estudiante no puede cambiar su role ni su email", async () => {
    const studentId = await insertAuthUser(client, "estudiante1@uptc.edu.co");
    const before = await getProfile(client, studentId);

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          "update public.profiles set role = 'admin' where id = $1",
          [studentId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          "update public.profiles set email = 'otro@uptc.edu.co' where id = $1",
          [studentId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    expect(await getProfile(client, studentId)).toEqual(before);
  });

  it("el estudiante sí puede cambiar su full_name", async () => {
    const studentId = await insertAuthUser(client, "estudiante2@uptc.edu.co", {
      fullName: "Nombre anterior",
    });

    await asAuthenticated(client, studentId, () =>
      client.query("update public.profiles set full_name = $1 where id = $2", [
        "Nombre nuevo",
        studentId,
      ]),
    );

    const profile = await getProfile(client, studentId);
    expect(profile?.full_name).toBe("Nombre nuevo");
  });

  it("el estudiante solo ve su propio perfil y el admin ve todos", async () => {
    const studentA = await insertAuthUser(client, "visible.a@uptc.edu.co");
    const studentB = await insertAuthUser(client, "visible.b@uptc.edu.co");
    const adminId = await insertAuthUser(client, "admin.visible@uptc.edu.co");
    await promoteToAdmin(client, adminId);

    const ownView = await asAuthenticated(client, studentA, () =>
      client.query<{ id: string }>("select id from public.profiles"),
    );
    expect(ownView.rows.map((row) => row.id)).toEqual([studentA]);

    const adminView = await asAuthenticated(client, adminId, () =>
      client.query<{ id: string }>("select id from public.profiles"),
    );
    expect(new Set(adminView.rows.map((row) => row.id))).toEqual(
      new Set([studentA, studentB, adminId]),
    );
  });

  it("solo el admin puede ver y crear invitaciones", async () => {
    const adminId = await insertAuthUser(client, "admin2@uptc.edu.co");
    await promoteToAdmin(client, adminId);
    const studentId = await insertAuthUser(client, "estudiante3@uptc.edu.co");
    const establishmentId = await insertEstablishment(client, {
      name: "Local del admin",
    });

    await asAuthenticated(client, adminId, () =>
      client.query(
        `insert into public.vendor_invites (email, establishment_id, invited_by)
         values ($1, $2, $3)`,
        ["invitado@example.com", establishmentId, adminId],
      ),
    );

    const adminView = await asAuthenticated(client, adminId, () =>
      client.query<InviteRow>(
        "select email, accepted_at, accepted_by from public.vendor_invites",
      ),
    );
    expect(adminView.rows).toHaveLength(1);

    const studentView = await asAuthenticated(client, studentId, () =>
      client.query<InviteRow>(
        "select email, accepted_at, accepted_by from public.vendor_invites",
      ),
    );
    expect(studentView.rows).toHaveLength(0);

    await expect(
      asAuthenticated(client, studentId, () =>
        client.query(
          `insert into public.vendor_invites (email, establishment_id, invited_by)
           values ($1, $2, $3)`,
          ["otro@example.com", establishmentId, studentId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("no permite dos invitaciones abiertas para el mismo correo", async () => {
    const adminId = await insertAuthUser(client, "admin3@uptc.edu.co");
    await promoteToAdmin(client, adminId);
    const establishmentId = await insertEstablishment(client, {
      name: "Local duplicado",
    });

    const invite = () =>
      asAuthenticated(client, adminId, () =>
        client.query(
          `insert into public.vendor_invites (email, establishment_id, invited_by)
           values ($1, $2, $3)`,
          ["duplicado@example.com", establishmentId, adminId],
        ),
      );

    await invite();
    await expect(invite()).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("is_institutional_student", () => {
  it("exige rol student, correo confirmado y dominio permitido", async () => {
    const confirmed = await insertAuthUser(client, "confirmado@uptc.edu.co");
    const confirmedResult = await asAuthenticated(client, confirmed, () =>
      client.query<BooleanRow>(
        "select public.is_institutional_student() as value",
      ),
    );
    expect(confirmedResult.rows[0]?.value).toBe(true);

    const unconfirmed = await insertAuthUser(
      client,
      "sin.confirmar@uptc.edu.co",
      { confirmed: false },
    );
    const unconfirmedResult = await asAuthenticated(client, unconfirmed, () =>
      client.query<BooleanRow>(
        "select public.is_institutional_student() as value",
      ),
    );
    expect(unconfirmedResult.rows[0]?.value).toBe(false);
  });
});
