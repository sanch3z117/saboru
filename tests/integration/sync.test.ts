import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import type { LimiterKind } from "@/lib/rate-limit";
import { processSyncOperations } from "@/server/services/sync";
import type { Database } from "@/types/database";

import { createClient, insertAuthUser, insertReview } from "./support";

const PRODUCT_ID = "20000000-0000-4000-8000-000000000001";
const ESTABLISHMENT_ID = "10000000-0000-4000-8000-000000000001";

function loadLocalEnv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

const LOCAL_ENV = loadLocalEnv();
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  LOCAL_ENV.NEXT_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  LOCAL_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ??
  "super-secret-jwt-token-with-at-least-32-characters-long";

let client: Client;
const createdUsers: string[] = [];

function signToken(userId: string, email: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      email,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

function userClient(userId: string, email: string) {
  const supabase = createSupabaseClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${signToken(userId, email)}` } },
  });

  // Sin sesión local no hay refresh token: el JWT mintado ya viaja en las
  // peticiones y el servicio solo necesita el id.
  (
    supabase.auth as unknown as {
      getUser: () => Promise<{
        data: { user: { id: string; email: string } | null };
        error: null;
      }>;
    }
  ).getUser = async () => ({ data: { user: { id: userId, email } }, error: null });

  return supabase;
}

function anonClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createStudent() {
  const email = `sync.${randomUUID()}@uptc.edu.co`;
  const userId = await insertAuthUser(client, email);
  createdUsers.push(userId);
  return { userId, email, supabase: userClient(userId, email) };
}

async function cleanupUsers() {
  if (createdUsers.length === 0) return;
  await client.query("delete from auth.users where id = any($1::uuid[])", [
    createdUsers.splice(0),
  ]);
}

function makeLimit(options: { allowSync?: number; failKinds?: string[] } = {}) {
  let syncCalls = 0;

  return async (kind: LimiterKind) => {
    if (options.failKinds?.includes(kind)) {
      return { success: false };
    }
    if (kind === "sync") {
      syncCalls += 1;
      return { success: syncCalls <= (options.allowSync ?? 1000) };
    }
    return { success: true };
  };
}

function reviewOperation(clientId = randomUUID()) {
  return {
    type: "review" as const,
    clientId,
    payload: {
      clientId,
      productId: PRODUCT_ID,
      establishmentId: ESTABLISHMENT_ID,
      comment: "Reseña de integración",
      rating_sabor: 4,
      rating_cantidad: 4,
      rating_precio: 4,
      rating_presentacion: 4,
      rating_calidad_precio: 4,
    },
  };
}

function favoriteOperation(action: "add" | "remove", clientId = randomUUID()) {
  return {
    type: "favorite" as const,
    clientId,
    payload: { action, establishmentId: ESTABLISHMENT_ID, productId: PRODUCT_ID },
  };
}

async function count(query: string, params: unknown[]) {
  const result = await client.query<{ count: number }>(query, params);
  return result.rows[0]?.count ?? 0;
}

beforeAll(async () => {
  client = createClient();
  await client.connect();
});

afterAll(async () => {
  await cleanupUsers();
  await client.end();
});

afterEach(async () => {
  await cleanupUsers();
});

describe("/api/sync: servicios y lote", () => {
  it("una reseña se aplica una vez y el duplicate no duplica", async () => {
    const student = await createStudent();
    const operation = reviewOperation();

    const first = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [operation],
      limit: makeLimit(),
    });
    expect(first.limited).toBe(false);
    if (!first.limited) {
      expect(first.results).toEqual([
        { clientId: operation.clientId, status: "ok" },
      ]);
    }

    const second = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [operation],
      limit: makeLimit(),
    });
    if (!second.limited) {
      expect(second.results[0]?.status).toBe("duplicate");
    }

    expect(
      await count(
        "select count(*)::int as count from public.reviews where user_id = $1 and product_id = $2",
        [student.userId, PRODUCT_ID],
      ),
    ).toBe(1);
  });

  it("un reporte duplicado no se inserta dos veces", async () => {
    const author = await createStudent();
    const reporter = await createStudent();
    const review = await insertReview(client, {
      userId: author.userId,
      establishmentId: ESTABLISHMENT_ID,
      productId: PRODUCT_ID,
    });

    const operation = {
      type: "report" as const,
      clientId: randomUUID(),
      payload: {
        clientId: "",
        reviewId: review.id,
        reason: "Contenido ofensivo",
      },
    };
    operation.payload.clientId = operation.clientId;

    const first = await processSyncOperations({
      client: reporter.supabase,
      userId: reporter.userId,
      operations: [operation],
      limit: makeLimit(),
    });
    if (!first.limited) {
      expect(first.results[0]?.status).toBe("ok");
    }

    const second = await processSyncOperations({
      client: reporter.supabase,
      userId: reporter.userId,
      operations: [operation],
      limit: makeLimit(),
    });
    if (!second.limited) {
      expect(second.results[0]?.status).toBe("duplicate");
    }

    expect(
      await count(
        "select count(*)::int as count from public.review_reports where review_id = $1",
        [review.id],
      ),
    ).toBe(1);
  });

  it("favorito: add es idempotente y remove también", async () => {
    const student = await createStudent();

    const add = favoriteOperation("add");
    const first = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [add],
      limit: makeLimit(),
    });
    if (!first.limited) {
      expect(first.results[0]?.status).toBe("ok");
    }

    const again = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [add],
      limit: makeLimit(),
    });
    if (!again.limited) {
      expect(again.results[0]?.status).toBe("duplicate");
    }

    expect(
      await count(
        "select count(*)::int as count from public.favorites where user_id = $1",
        [student.userId],
      ),
    ).toBe(1);

    const remove = favoriteOperation("remove");
    const removed = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [remove],
      limit: makeLimit(),
    });
    if (!removed.limited) {
      expect(removed.results[0]?.status).toBe("ok");
    }

    const removedAgain = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [favoriteOperation("remove")],
      limit: makeLimit(),
    });
    if (!removedAgain.limited) {
      expect(removedAgain.results[0]?.status).toBe("ok");
    }

    expect(
      await count(
        "select count(*)::int as count from public.favorites where user_id = $1",
        [student.userId],
      ),
    ).toBe(0);
  });

  it("rechaza una segunda reseña del mismo producto (30 días)", async () => {
    const student = await createStudent();

    await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [reviewOperation()],
      limit: makeLimit(),
    });

    const second = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [reviewOperation()],
      limit: makeLimit(),
    });

    if (!second.limited) {
      expect(second.results[0]).toMatchObject({
        status: "rejected",
        code: "review_cooldown",
      });
    }

    expect(
      await count(
        "select count(*)::int as count from public.reviews where user_id = $1 and product_id = $2",
        [student.userId, PRODUCT_ID],
      ),
    ).toBe(1);
  });

  it("aplica 20 lotes/h por usuario", async () => {
    const student = await createStudent();
    const limit = makeLimit({ allowSync: 20 });

    for (let index = 0; index < 20; index += 1) {
      const result = await processSyncOperations({
        client: student.supabase,
        userId: student.userId,
        operations: [favoriteOperation("remove")],
        limit,
      });
      expect(result.limited).toBe(false);
    }

    const blocked = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [favoriteOperation("remove")],
      limit,
    });

    expect(blocked).toEqual({ limited: true, results: [] });
  });

  it("rechaza la operación si el límite por tipo falla", async () => {
    const student = await createStudent();

    const result = await processSyncOperations({
      client: student.supabase,
      userId: student.userId,
      operations: [reviewOperation()],
      limit: makeLimit({ failKinds: ["review"] }),
    });

    if (!result.limited) {
      expect(result.results[0]).toMatchObject({
        status: "rejected",
        code: "rate_limited",
      });
    }

    expect(
      await count(
        "select count(*)::int as count from public.reviews where user_id = $1",
        [student.userId],
      ),
    ).toBe(0);
  });

  it("sin sesión no aplica nada", async () => {
    const result = await processSyncOperations({
      client: anonClient(),
      userId: "00000000-0000-0000-0000-000000000000",
      operations: [reviewOperation()],
      limit: makeLimit(),
    });

    if (!result.limited) {
      expect(result.results[0]).toMatchObject({
        status: "rejected",
        code: "unauthorized",
      });
    }
  });
});
