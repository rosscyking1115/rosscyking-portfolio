import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

/**
 * Redirect gate (migration risk #4).
 *
 * These are live SEO URLs with real inbound links — four renamed project slugs,
 * five retired projects, and the role-lens share links. Losing one is a silent
 * 404 that only surfaces in Search Console weeks later, so the brief asked for
 * a test per rule. This is that.
 *
 * Every expected status and destination below was captured from production with
 * `curl -sI https://rosscyking.com/<path>` — all nine answer 308, which is what
 * Next's `permanent: true` emits.
 *
 * ── Why each rule is checked twice ───────────────────────────────────────────
 * `astro dev` does not reliably honour the `status: 308` pinned in
 * astro.config.mjs — observed: 301 for the /projects/* rules, whose destinations
 * do not exist yet, and 308 for /opengraph-image, whose destination does. The
 * BUILD output has it right in every case: all ten land in
 * .vercel/output/config.json as 308.
 *
 * So a dev-only test would pin the wrong status, and a config-only test would
 * not prove the redirect actually works.
 *
 * Each rule therefore gets:
 *   1. a live request against the dev server  — proves it redirects, and where to
 *   2. an assertion on the build output       — proves the status that ships
 *
 * `npm run test:e2e` builds first so the build output is never stale.
 *
 * Redirects are not followed. Status + Location is the contract being ported;
 * following would exercise the destination page instead and mask a wrong code
 * or a wrong target behind a 200.
 */

const PERMANENT = 308;
/** Dev answers one permanent code or the other; the build output is the contract. */
const PERMANENT_IN_DEV = [301, 308];

/** Ported one-for-one from next.config.ts `redirects()`. */
const slugMoves = [
  ["internal-ai-agent-eval-lab", "agent-release-gates"],
  ["llm-redteam-harness", "redteam-foundry"],
  ["uk-property-analytics", "england-wales-housing-decision-support"],
  ["movein", "england-wales-housing-decision-support"],
] as const;

const retired = [
  "com6513-qa-assistant",
  "event-extraction-llm-baseline",
  "fromatob-file-converter",
  "scalable-machine-learning-pyspark",
  "speech-speed-tempo-classification",
] as const;

const expectedRules = [
  ...slugMoves.map(([from, to]) => ({
    source: `/projects/${from}`,
    destination: `/projects/${to}`,
  })),
  ...retired.map((from) => ({
    source: `/projects/${from}`,
    destination: "/projects",
  })),
  { source: "/opengraph-image", destination: "/opengraph-image.png" },
];

interface BuildRoute {
  src?: string;
  status?: number;
  headers?: Record<string, string>;
}

function readBuildRoutes(): BuildRoute[] {
  const path = fileURLToPath(
    new URL("../../.vercel/output/config.json", import.meta.url),
  );
  return (JSON.parse(readFileSync(path, "utf8")) as { routes: BuildRoute[] }).routes;
}

test.describe("redirects — live behaviour", () => {
  for (const { source, destination } of expectedRules) {
    test(`${source} redirects to ${destination}`, async ({ request }) => {
      const res = await request.get(source, { maxRedirects: 0 });
      expect(PERMANENT_IN_DEV).toContain(res.status());
      expect(res.headers()["location"]).toBe(destination);
    });
  }
});

test.describe("redirects — status that actually ships", () => {
  test("the build output exists (guards the assertions below)", () => {
    expect(readBuildRoutes().length).toBeGreaterThan(0);
  });

  for (const { source, destination } of expectedRules) {
    test(`${source} ships as ${PERMANENT}`, () => {
      const route = readBuildRoutes().find((r) => r.src === `^${source}$`);
      expect(route, `no built route for ${source}`).toBeDefined();
      expect(route?.status).toBe(PERMANENT);
      expect(route?.headers?.Location).toBe(destination);
    });
  }
});

/**
 * The tenth rule is config-only. Astro cannot express a query-string
 * destination — it fails the build with InvalidRedirectDestination, because the
 * destination of a dynamic redirect must include the source's dynamic
 * parameters and a query string is not a route. So /for/:lens lives in
 * vercel.json and is applied by Vercel's edge, which `astro dev` does not
 * emulate. Same limitation and same gate 9 caveat as headers.spec.ts.
 */
test.describe("role-lens share links (config parity — see gate 9)", () => {
  test("vercel.json redirects /for/:lens to the home lens, permanently", () => {
    const configPath = fileURLToPath(new URL("../../vercel.json", import.meta.url));
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      redirects?: Array<{ source: string; destination: string; permanent: boolean }>;
    };

    const rule = config.redirects?.find((r) => r.source === "/for/:lens");
    expect(rule, "no /for/:lens rule in vercel.json").toBeDefined();
    expect(rule?.destination).toBe("/?lens=:lens");
    // Vercel maps `permanent: true` to 308, matching production.
    expect(rule?.permanent).toBe(true);
  });
});
