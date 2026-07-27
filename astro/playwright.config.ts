import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the Astro app, deliberately separate from the root
 * playwright.config.ts (which drives the Next app on :3100) so both suites can
 * run side by side for the whole migration.
 *
 * ⚠ Runs against `astro dev`, NOT a production build. That is a constraint, not
 * a preference: `@astrojs/vercel` does not implement the preview command —
 *
 *     [preview] The @astrojs/vercel adapter does not support the preview command.
 *
 * so there is no way to serve the built on-demand /contact function locally
 * without `vercel dev` and a linked project. The action code under test is the
 * same either way, but the serverless wrapper is not exercised here.
 *
 * This is exactly why the Phase 1 pass gate requires headers and on-demand
 * behaviour to be re-verified against a real Vercel preview deployment rather
 * than localhost. See MIGRATION-PLAN-2026-07-26-astro.md §5, gate 9.
 */
const PORT = 4331;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "html",
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      // Astro 7 auto-detects an agentic environment (via `am-i-vibing`, which
      // keys on CLAUDECODE among others) and force-backgrounds `astro dev`.
      // The npm wrapper then exits and Playwright reports the misleading
      // "Process from config.webServer exited early". Blanking the variable
      // restores a foreground server that Playwright owns and can shut down.
      //
      // No-op in CI, where CLAUDECODE is never set — this only matters when
      // the suite is run from inside a coding agent.
      CLAUDECODE: "",
    },
  },
});
