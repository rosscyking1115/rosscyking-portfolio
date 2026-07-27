// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

/**
 * Migration note (risk #1 — contact form).
 *
 * `output` stays 'static' (Astro's default): four of the five routes are
 * prerendered forever. Only /contact opts out via `export const prerender =
 * false`, because Astro Actions called from a form require on-demand
 * rendering, which in turn requires an adapter.
 *   https://docs.astro.build/en/guides/actions/
 *   https://docs.astro.build/en/guides/on-demand-rendering/
 *
 * `staticHeaders` (added in @astrojs/vercel@10.0.0) writes headers Astro
 * produces — notably Content-Security-Policy — into vercel.json for the
 * PRERENDERED routes, instead of emitting a <meta http-equiv> tag. That is
 * what stops the migration silently dropping the site's CSP.
 *   https://docs.astro.build/en/guides/integrations-guide/vercel/
 *
 * The other eight security headers (HSTS, X-Frame-Options, Referrer-Policy,
 * Permissions-Policy, COOP, CORP, X-Content-Type-Options, X-DNS-Prefetch-
 * Control) are not Astro features and have no Astro config source. They land
 * in vercel.json by hand — that is risk #2, not this branch.
 */
export default defineConfig({
  site: "https://rosscyking.com",
  output: "static",
  integrations: [react()],
  adapter: vercel({ staticHeaders: true }),

  // https://docs.astro.build/en/guides/environment-variables/
  // Replaces the Next app's hand-rolled src/lib/env.ts zod validation.
  // NOTE: the NEXT_PUBLIC_ prefix becomes PUBLIC_ — these need renaming in
  // the Vercel dashboard before cutover. Flagged in MIGRATION-PLAN.
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      RESEND_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      RESEND_TO_EMAIL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      RESEND_FROM_EMAIL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      UPSTASH_REDIS_REST_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
});
