// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";

import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

import mdx from "@astrojs/mdx";

import tailwindcss from "@tailwindcss/vite";

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

  /**
   * Migration note (risk #4 — redirects).
   *
   * Nine live SEO redirects ported from next.config.ts. Production answers all
   * nine with 308 (Next's `permanent: true`), so each is pinned to 308
   * explicitly: Astro's default for a permanent redirect is 301, which is
   * SEO-equivalent but not byte-parity.
   *
   * These live here rather than in vercel.json because Astro compiles them into
   * .vercel/output/config.json AND serves them in `astro dev`, so every rule is
   * covered by a real end-to-end test rather than a config diff.
   *
   * The tenth rule — /for/:lens -> /?lens=:lens — CANNOT be expressed here.
   * Astro rejects it at build time with InvalidRedirectDestination: "The
   * destination of a dynamic redirect must include all dynamic parameters from
   * the source route", and a query string is not a route. It lives in
   * vercel.json instead; see the comment there.
   *   https://docs.astro.build/en/reference/configuration-reference/
   */
  redirects: {
    // Project pages that were renamed keep their old URLs working.
    "/projects/internal-ai-agent-eval-lab": {
      status: 308,
      destination: "/projects/agent-release-gates",
    },
    "/projects/llm-redteam-harness": {
      status: 308,
      destination: "/projects/redteam-foundry",
    },
    "/projects/uk-property-analytics": {
      status: 308,
      destination: "/projects/england-wales-housing-decision-support",
    },
    "/projects/movein": {
      status: 308,
      destination: "/projects/england-wales-housing-decision-support",
    },

    // Retired projects land on the index rather than a 404.
    "/projects/com6513-qa-assistant": { status: 308, destination: "/projects" },
    "/projects/event-extraction-llm-baseline": { status: 308, destination: "/projects" },
    "/projects/fromatob-file-converter": { status: 308, destination: "/projects" },
    "/projects/scalable-machine-learning-pyspark": {
      status: 308,
      destination: "/projects",
    },
    "/projects/speech-speed-tempo-classification": {
      status: 308,
      destination: "/projects",
    },

    // Migration insurance: the OG card moved from Next's extensionless
    // /opengraph-image to a prerendered file. Nothing should hold the old URL,
    // but a social platform that cached it costs nothing to keep working.
    "/opengraph-image": { status: 308, destination: "/opengraph-image.png" },
  },

  /**
   * Migration note (Phase A — design foundation).
   *
   * The Next app loaded fonts with `next/font`: GeistSans and GeistMono from the
   * `geist` package, Space Grotesk from next/font/google. Astro's Fonts API
   * (stable since astro@6.0.0) replaces all three.
   *
   * The cssVariable names deliberately match the Next ones, so the design tokens
   * in src/styles/global.css port across verbatim rather than being rewritten.
   *
   * Fontsource keeps every file self-hosted and served from _astro/fonts, which
   * matters beyond performance: the production CSP allows `font-src 'self'
   * data:` and no font CDN origin. A Google-hosted stylesheet would have needed
   * the policy widened. Self-hosting keeps risk #2's header set untouched.
   *
   * Weights are listed explicitly rather than taking the variable-font range —
   * only 400 is downloaded by default, and unused weights are wasted bytes on a
   * Lighthouse gate that starts at 93.
   *   https://docs.astro.build/en/guides/fonts/
   */
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Geist",
      cssVariable: "--font-geist-sans",
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Geist Mono",
      cssVariable: "--font-geist-mono",
      weights: [400, 500],
      styles: ["normal"],
      fallbacks: ["ui-monospace", "monospace"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Space Grotesk",
      cssVariable: "--font-space-grotesk",
      weights: [600, 700],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],

  vite: {
    // @resvg/resvg-js (OG card rendering) ships a native .node binary. Vite's
    // dependency optimizer tries to prebundle it and dies with
    // "[UNLOADABLE_DEPENDENCY] ... stream did not contain valid UTF-8", which
    // takes down the whole dev server for every HTML page — not just the OG
    // endpoints. Excluding it from prebundling and keeping it external to the
    // SSR bundle lets Node load the binary directly.
    optimizeDeps: { exclude: ["@resvg/resvg-js"] },

    ssr: { external: ["@resvg/resvg-js"] },
    plugins: [tailwindcss()],
  },
  integrations: [react(), mdx()],
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