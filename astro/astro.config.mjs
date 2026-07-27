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
 * Migration note (risk #2 — security headers).
 *
 * ALL NINE security headers live in vercel.json, hand-written. Astro's own
 * CSP feature (`security.csp`) is deliberately NOT used. It is a real feature
 * and it does work — enabling it writes per-route CSP headers with generated
 * hashes into .vercel/output/config.json — but it is wrong for this site on
 * three documented counts:
 *
 *   - "Shiki isn't currently supported". Every /projects/[slug] page renders
 *     MDX code blocks through Shiki, which emits inline styles.
 *   - "External scripts and external styles are not supported out of the box".
 *     Turnstile (challenges.cloudflare.com) and Vercel Analytics are both
 *     external scripts already in the production CSP.
 *   - It "isn't supported while working in dev mode", so it cannot be checked
 *     locally without a build.
 *
 *   https://docs.astro.build/en/reference/configuration-reference/
 *
 * Hand-writing vercel.json instead gives byte-exact parity with the header set
 * next.config.ts serves today, verified against a captured production response
 * in tests/e2e/headers.spec.ts.
 *
 * `staticHeaders` (added in @astrojs/vercel@10.0.0) is therefore currently
 * INERT — it only forwards headers Astro itself produces, and with CSP off
 * Astro produces none. It is kept switched on so that if the Shiki limitation
 * is lifted, enabling `security.csp` starts emitting real headers rather than
 * a <meta http-equiv> tag. Verified locally: the adapter does NOT overwrite a
 * hand-written vercel.json, so the two mechanisms coexist safely.
 *   https://docs.astro.build/en/guides/integrations-guide/vercel/
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
