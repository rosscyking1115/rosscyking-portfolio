import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

let cached: Ratelimit | null = null;

/**
 * Returns a configured Ratelimit, or null when Upstash creds aren't set.
 * Callers must handle the null case (rate-limiting becomes a no-op in dev).
 */
export function getRateLimiter(): Ratelimit | null {
  if (cached) return cached;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  cached = new Ratelimit({
    redis,
    // Five contact submissions per hour per IP. Generous for humans, tight for bots.
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "rosscyking-portfolio:contact",
  });

  return cached;
}
