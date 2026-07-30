import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

/**
 * Header parity gate for migration risk #2.
 *
 * The single easiest thing to lose silently in this migration is the security
 * header set. Next applied it from `next.config.ts`'s `headers()`; static Astro
 * has no header mechanism at all, so it moves to hosting config (vercel.json).
 *
 * ── What this test can and cannot prove ──────────────────────────────────────
 * It proves the CONFIGURED values still match production byte for byte, by
 * diffing vercel.json against a fixture captured from the live site with
 * `curl -sI https://rosscyking.com/`. That catches a dropped header, a typo,
 * or a weakened directive at PR time.
 *
 * It does NOT prove the headers are actually served. vercel.json is applied by
 * Vercel's edge, and the Astro app is not yet a Vercel project (the existing
 * project's Root Directory is the repo root, which builds the Next app). Until
 * a project points at astro/, gate 9 of the migration plan — `curl -sI` against
 * a real preview deployment — remains outstanding. See MIGRATION-PLAN §5.
 *
 * Reading the config file is exactly the failure mode the brief warned about,
 * so this test is a drift alarm, not the gate. Do not treat it as the gate.
 */

const repoUrl = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The nine headers next.config.ts sets on every route. */
const REQUIRED_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "x-dns-prefetch-control",
] as const;

/** Parse raw `curl -sI` output into a lowercased header map. */
function parseCurlHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const at = line.indexOf(":");
    if (at < 1 || /^HTTP\//i.test(line)) continue;
    headers.set(line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim());
  }
  return headers;
}

interface VercelHeaderRule {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

const production = parseCurlHeaders(
  readFileSync(repoUrl("../fixtures/production-headers-next.txt"), "utf8"),
);

const vercelConfig = JSON.parse(readFileSync(repoUrl("../../vercel.json"), "utf8")) as {
  headers: VercelHeaderRule[];
};

const catchAllRule = vercelConfig.headers.find((rule) => rule.source === "/(.*)");

const configured = new Map(
  (catchAllRule?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]),
);

/**
 * Vercel validates vercel.json against a published schema and REJECTS THE
 * DEPLOYMENT for any unknown top-level property — it does not warn and carry on.
 *
 * This cost a deploy: the file carried a `_comment` key explaining why the
 * `/for/:lens` redirect lives here rather than in astro.config.mjs, and Vercel
 * answered "Invalid request: should NOT have additional property `_comment`".
 * JSON has no comment syntax and Vercel allows no substitute, so that reasoning
 * now lives in LensScript.astro and redirects.spec.ts.
 *
 * Checked against the real schema at https://openapi.vercel.sh/vercel.json,
 * which lists 40 permitted properties. The allowlist is hardcoded rather than
 * fetched so the suite stays offline and deterministic.
 */
test.describe("vercel.json stays deployable", () => {
  const ALLOWED_TOP_LEVEL = new Set(["$schema", "redirects", "headers"]);

  test("has no property Vercel will reject at deploy time", () => {
    const raw = JSON.parse(readFileSync(repoUrl("../../vercel.json"), "utf8")) as Record<
      string,
      unknown
    >;

    const unknown = Object.keys(raw).filter((key) => !ALLOWED_TOP_LEVEL.has(key));
    expect(
      unknown,
      `unknown vercel.json keys will fail the deployment: ${unknown.join(", ")}`,
    ).toEqual([]);
  });
});

test.describe("security header parity (config vs live production)", () => {
  test("the fixture actually captured a production response", () => {
    // Guards against a truncated or stale fixture silently making the whole
    // suite vacuous — every assertion below would pass against an empty map.
    for (const header of REQUIRED_HEADERS) {
      expect(production.get(header), `fixture is missing ${header}`).toBeTruthy();
    }
  });

  test("vercel.json applies its headers to every route", () => {
    expect(catchAllRule, "no catch-all /(.*)  header rule in vercel.json").toBeDefined();
  });

  for (const header of REQUIRED_HEADERS) {
    test(`${header} matches production exactly`, () => {
      expect(configured.get(header), `${header} is missing from vercel.json`).toBe(
        production.get(header),
      );
    });
  }

  test("no security header was dropped", () => {
    expect([...configured.keys()].sort()).toEqual([...REQUIRED_HEADERS].sort());
  });

  test("security.txt keeps its content type and cache policy", () => {
    const rule = vercelConfig.headers.find(
      (r) => r.source === "/.well-known/security.txt",
    );
    expect(rule, "no rule for /.well-known/security.txt").toBeDefined();
    const map = new Map((rule?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
    expect(map.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(map.get("cache-control")).toBe("public, max-age=86400");
  });
});

test.describe("security.txt content", () => {
  test("is served and keeps the required RFC 9116 fields", async ({ request }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Contact:/);
    expect(body).toMatch(/Expires:/);
  });
});
