import { randomUUID } from "node:crypto";

import { Client } from "pg";

export const connectionString =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export type ProfileRow = {
  id: string;
  role: string;
  email: string;
  full_name: string;
};

export type CountRow = { count: number };
export type BooleanRow = { value: boolean };

export function createClient() {
  return new Client({ connectionString });
}

export async function insertAuthUser(
  client: Client,
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

export async function getProfile(client: Client, id: string) {
  const result = await client.query<ProfileRow>(
    "select id, role, email, full_name from public.profiles where id = $1",
    [id],
  );

  return result.rows[0];
}

export async function countProfiles(client: Client, email: string) {
  const result = await client.query<CountRow>(
    "select count(*)::int as count from public.profiles where email = $1",
    [email],
  );

  return result.rows[0]?.count;
}

export async function promoteToAdmin(client: Client, id: string) {
  await client.query(
    "update public.profiles set role = 'admin' where id = $1",
    [id],
  );
}

export async function insertEstablishment(
  client: Client,
  options: {
    name?: string;
    ownerId?: string | null;
    status?: "draft" | "pending" | "active" | "suspended";
  } = {},
) {
  const id = randomUUID();

  await client.query(
    `insert into public.establishments
       (id, owner_id, name, slug, location, status)
     values ($1, $2, $3, $4,
             extensions.st_point($5::double precision, $6::double precision)::extensions.geography,
             $7::public.establishment_status)`,
    [
      id,
      options.ownerId ?? null,
      options.name ?? "Local de prueba",
      `local-${id}`,
      -73.3567,
      5.552,
      options.status ?? "active",
    ],
  );

  return id;
}

export async function insertProduct(
  client: Client,
  establishmentId: string,
  options: { name?: string; price?: number; available?: boolean } = {},
) {
  const id = randomUUID();

  await client.query(
    `insert into public.products
       (id, establishment_id, name, price_cop, available)
     values ($1, $2, $3, $4, $5)`,
    [
      id,
      establishmentId,
      options.name ?? "Producto de prueba",
      options.price ?? 9000,
      options.available ?? true,
    ],
  );

  return id;
}

export async function insertReview(
  client: Client,
  options: {
    userId: string;
    establishmentId: string;
    productId: string;
    clientId?: string;
    comment?: string | null;
    ratings?: [number, number, number, number, number];
  },
) {
  const id = randomUUID();
  const clientId = options.clientId ?? randomUUID();
  const ratings = options.ratings ?? [4, 4, 4, 4, 4];

  await client.query(
    `insert into public.reviews
       (id, client_id, user_id, product_id, establishment_id,
        rating_sabor, rating_cantidad, rating_precio,
        rating_presentacion, rating_calidad_precio, comment)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      clientId,
      options.userId,
      options.productId,
      options.establishmentId,
      ...ratings,
      options.comment ?? "Comentario de prueba",
    ],
  );

  return { id, clientId };
}

async function clearAuthContext(client: Client) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claims', '', true)");
  await client.query("select set_config('request.jwt.claim.sub', '', true)");
}

/**
 * Ejecuta una consulta con el rol indicado (y el JWT simulado de PostgREST
 * cuando aplica). Si falla, revierte al savepoint para que la transacción
 * de la prueba siga viva.
 */
async function asRole<T>(
  client: Client,
  role: "anon" | "authenticated",
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query("savepoint as_role");
  await client.query(`set local role ${role}`);

  if (userId) {
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role }),
    ]);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      userId,
    ]);
  }

  try {
    const result = await fn();
    await clearAuthContext(client);
    return result;
  } catch (error) {
    await client.query("rollback to savepoint as_role");
    await clearAuthContext(client);
    throw error;
  }
}

export function asAuthenticated<T>(
  client: Client,
  userId: string,
  fn: () => Promise<T>,
) {
  return asRole(client, "authenticated", userId, fn);
}

export function asAnon<T>(client: Client, fn: () => Promise<T>) {
  return asRole(client, "anon", null, fn);
}
