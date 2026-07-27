import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from "astro:env/server";

let cached: Ratelimit | null = null;

/**
 * Returns a configured Ratelimit, or null when Upstash creds aren't set.
 * Callers must handle the null case (rate-limiting becomes a no-op in dev).
 *
 * Ported from the Next app. Two changes:
 *   - `import "server-only"` dropped; `astro:env/server` is itself the
 *     server-only boundary and fails the build if imported client-side.
 *     https://docs.astro.build/en/guides/environment-variables/
 *   - env now comes from the astro:env schema in astro.config.mjs rather
 *     than a hand-rolled zod parse of process.env.
 *
 * The Upstash prefix is kept byte-identical so the migration does not reset
 * anyone's in-flight rate-limit window.
 */
export function getRateLimiter(): Ratelimit | null {
  if (cached) return cached;
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const redis = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
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
