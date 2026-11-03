import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { checkRateLimit, type LimiterKind } from "@/lib/rate-limit";
import type { SyncOperation, SyncRequestBody } from "@/lib/validations/sync";
import { toggleFavorite } from "@/server/services/favorites";
import { createReview, reportReview } from "@/server/services/reviews";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export const SYNC_MAX_OPERATIONS = 20;

export type SyncLimit = (
  kind: LimiterKind,
  identifier: string,
) => Promise<{ success: boolean }>;

export type SyncOperationResult = {
  clientId: string;
  status: "ok" | "duplicate" | "rejected";
  code?: string;
};

export type SyncProcessResult =
  | { limited: true; results: [] }
  | { limited: false; results: SyncOperationResult[] };

/**
 * Aplica un lote con los mismos servicios que las server actions.
 * - Limita a 20 lotes/h por usuario (`sync`) y a un límite por tipo de acción.
 * - `duplicate` se trata como éxito; `rejected` no se reintenta en el cliente.
 */
export async function processSyncOperations({
  client,
  userId,
  operations,
  limit = checkRateLimit,
}: {
  client: Client;
  userId: string;
  operations: SyncOperation[];
  limit?: SyncLimit;
}): Promise<SyncProcessResult> {
  const batch = await limit("sync", userId);
  if (!batch.success) {
    return { limited: true, results: [] };
  }

  const results: SyncOperationResult[] = [];

  for (const operation of operations) {
    const kind: LimiterKind =
      operation.type === "report"
        ? "report"
        : operation.type === "favorite"
          ? "favorite"
          : "review";

    const allowed = await limit(kind, userId);
    if (!allowed.success) {
      results.push({
        clientId: operation.clientId,
        status: "rejected",
        code: "rate_limited",
      });
      continue;
    }

    if (operation.type === "review") {
      const result = await createReview(client, operation.payload);
      results.push(
        result.ok
          ? {
              clientId: operation.clientId,
              status: result.duplicate ? "duplicate" : "ok",
            }
          : {
              clientId: operation.clientId,
              status: "rejected",
              code: result.code,
            },
      );
      continue;
    }

    if (operation.type === "report") {
      const result = await reportReview(client, operation.payload);
      results.push(
        result.ok
          ? {
              clientId: operation.clientId,
              status: result.duplicate ? "duplicate" : "ok",
            }
          : {
              clientId: operation.clientId,
              status: "rejected",
              code: result.code,
            },
      );
      continue;
    }

    const result = await toggleFavorite(client, operation.payload);
    results.push(
      result.ok
        ? {
            clientId: operation.clientId,
            status: result.duplicate ? "duplicate" : "ok",
          }
        : {
            clientId: operation.clientId,
            status: "rejected",
            code: result.code,
          },
    );
  }

  return { limited: false, results };
}

export type { SyncRequestBody };
