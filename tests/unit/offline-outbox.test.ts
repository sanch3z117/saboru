import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openOfflineDb } from "@/lib/offline/db";
import { isFavorite, setLocalFavorite } from "@/lib/offline/favorites";
import {
  enqueueOperation,
  listOutbox,
  listPending,
  markSending,
  resetOrphanSending,
} from "@/lib/offline/outbox";
import { backoffDelayMs, syncOutbox } from "@/lib/offline/sync";

const PRODUCT = "20000000-0000-4000-8000-000000000001";
const ESTABLISHMENT = "10000000-0000-4000-8000-000000000001";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

const reviewPayload = {
  productId: PRODUCT,
  establishmentId: ESTABLISHMENT,
  comment: "Rica",
  rating_sabor: 5,
  rating_cantidad: 5,
  rating_precio: 5,
  rating_presentacion: 5,
  rating_calidad_precio: 5,
};

async function queueReview(userId = USER_A) {
  const result = await enqueueOperation({
    userId,
    type: "review",
    payload: reviewPayload,
  });
  if (!result.ok) throw new Error(`No se pudo encolar: ${result.reason}`);
  return result.item;
}

beforeEach(async () => {
  const db = await openOfflineDb();
  await Promise.all([db.clear("outbox"), db.clear("favorites")]);
  db.close();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("outbox", () => {
  it("encola con clientId y aísla por userId", async () => {
    const review = await queueReview(USER_A);
    const favorite = await enqueueOperation({
      userId: USER_B,
      type: "favorite",
      payload: { action: "add", establishmentId: ESTABLISHMENT, productId: PRODUCT },
    });

    expect(favorite.ok).toBe(true);
    expect(review.clientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect((review.payload as { clientId: string }).clientId).toBe(
      review.clientId,
    );

    const pendingA = await listPending(USER_A);
    const pendingB = await listPending(USER_B);
    expect(pendingA).toHaveLength(1);
    expect(pendingA[0]?.type).toBe("review");
    expect(pendingB).toHaveLength(1);
    expect(pendingB[0]?.type).toBe("favorite");
  });

  it("rechaza un payload inválido antes de guardarlo", async () => {
    const result = await enqueueOperation({
      userId: USER_A,
      type: "review",
      payload: { ...reviewPayload, rating_sabor: 9 },
    });

    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(await listOutbox(USER_A)).toHaveLength(0);
  });

  it("un sending huérfano vuelve a pending al abrir", async () => {
    const item = await queueReview();
    await markSending([item.clientId]);
    expect((await listOutbox(USER_A))[0]?.status).toBe("sending");

    await resetOrphanSending();

    const pending = await listPending(USER_A);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe("pending");
  });
});

describe("sincronización de la cola", () => {
  it("duplicate sale de la cola y rejected se marca sin reintentar", async () => {
    const first = await queueReview();
    const second = await enqueueOperation({
      userId: USER_A,
      type: "favorite",
      payload: { action: "add", establishmentId: ESTABLISHMENT, productId: PRODUCT },
    });
    if (!second.ok) throw new Error("favorite no encolado");

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            results: [
              { clientId: first.clientId, status: "duplicate" },
              {
                clientId: second.item.clientId,
                status: "rejected",
                code: "review_cooldown",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );

    const outcome = await syncOutbox(
      USER_A,
      fetchMock as unknown as typeof fetch,
    );

    expect(outcome).toMatchObject({ status: "ok", sent: 1, rejected: 1 });

    const items = await listOutbox(USER_A);
    expect(items).toHaveLength(1);
    expect(items[0]?.clientId).toBe(second.item.clientId);
    expect(items[0]?.status).toBe("rejected");
    expect(items[0]?.errorCode).toBe("review_cooldown");

    const secondFetch = vi.fn();
    const secondOutcome = await syncOutbox(
      USER_A,
      secondFetch as unknown as typeof fetch,
    );
    expect(secondOutcome.status).toBe("empty");
    expect(secondFetch).not.toHaveBeenCalled();
  });

  it("401 conserva la cola y no cuenta intento", async () => {
    const item = await queueReview();
    const fetchMock = vi.fn(
      async () => new Response("no", { status: 401 }),
    );

    const outcome = await syncOutbox(
      USER_A,
      fetchMock as unknown as typeof fetch,
    );

    expect(outcome.status).toBe("unauthorized");
    const [stored] = await listOutbox(USER_A);
    expect(stored?.clientId).toBe(item.clientId);
    expect(stored?.status).toBe("pending");
    expect(stored?.attempts).toBe(0);
  });

  it("error de red o 5xx deja pending y suma intento", async () => {
    await queueReview();

    const network = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(
      (await syncOutbox(USER_A, network as unknown as typeof fetch)).status,
    ).toBe("error");

    let [stored] = await listOutbox(USER_A);
    expect(stored?.status).toBe("pending");
    expect(stored?.attempts).toBe(1);

    const serverError = vi.fn(async () => new Response("boom", { status: 500 }));
    await syncOutbox(USER_A, serverError as unknown as typeof fetch);

    [stored] = await listOutbox(USER_A);
    expect(stored?.status).toBe("pending");
    expect(stored?.attempts).toBe(2);
  });

  it("sin conexión no llama al servidor", async () => {
    await queueReview();
    vi.stubGlobal("navigator", { onLine: false });

    const fetchMock = vi.fn();
    const outcome = await syncOutbox(
      USER_A,
      fetchMock as unknown as typeof fetch,
    );

    expect(outcome.status).toBe("offline");
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await listOutbox(USER_A))[0]?.status).toBe("pending");
  });

  it("el backoff crece y se limita", () => {
    expect(backoffDelayMs(0)).toBe(1000);
    expect(backoffDelayMs(1)).toBe(2000);
    expect(backoffDelayMs(3)).toBe(8000);
    expect(backoffDelayMs(10)).toBe(30_000);
  });
});

describe("favoritos locales", () => {
  it("guarda y quita la copia local por usuario", async () => {
    const target = {
      userId: USER_A,
      establishmentId: ESTABLISHMENT,
      productId: PRODUCT,
    };

    expect(await isFavorite(target)).toBe(false);
    await setLocalFavorite(target, "add");
    expect(await isFavorite(target)).toBe(true);

    await setLocalFavorite(target, "remove");
    expect(await isFavorite(target)).toBe(false);
  });
});
