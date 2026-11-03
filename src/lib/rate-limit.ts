import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimiterKind = "search" | "view";

type Limiters = Record<LimiterKind, Ratelimit>;

let cachedLimiters: Limiters | null | undefined;

function resolveLimiters(): Limiters | null {
  if (cachedLimiters !== undefined) return cachedLimiters;

  if (process.env.RATE_LIMIT_DISABLED === "true") {
    cachedLimiters = null;
    return cachedLimiters;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Rate limit no configurado: define UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN, o RATE_LIMIT_DISABLED=true solo en local.",
    );
  }

  const redis = new Redis({ url, token });

  cachedLimiters = {
    search: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "saboru:search",
    }),
    view: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "saboru:view",
    }),
  };

  return cachedLimiters;
}

export async function checkRateLimit(kind: LimiterKind, identifier: string) {
  const limiters = resolveLimiters();
  if (!limiters) return { success: true };

  const result = await limiters[kind].limit(identifier);
  return { success: result.success };
}
