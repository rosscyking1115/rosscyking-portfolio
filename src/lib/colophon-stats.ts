import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import pkg from "../../package.json";

/**
 * Numbers about the site itself, counted at build time.
 *
 * The colophon "ships genuinely last: it reports numbers about the finished
 * site" — so every figure on it has to be counted rather than typed (§03 R8),
 * for the same reason the projects log's ledger is. A hand-written "200+ tests"
 * on the one page whose subject is craft would be the page contradicting itself.
 *
 * ── WHAT IS DELIBERATELY NOT COUNTED HERE, AND WHY ───────────────────────────
 * THE END-TO-END TEST COUNT. `test(` appears 130 times in tests/e2e, and the
 * runner reports 211. The difference is real and not a bug: many cases are
 * generated in loops — one per route, per theme, per viewport — so counting the
 * literal calls would undercount by 38%, and printing the runner's number would
 * be typing it. Neither is acceptable on this page, so it counts SPEC FILES,
 * which is exact, and says what it cannot count in the limits section.
 *
 * Unit tests have no such problem: `it(` appears 42 times and vitest reports 42.
 *
 * THE JAVASCRIPT SHIPPED. This module runs while the page is being built, which
 * is before the bundle it would have to measure exists. Also stated as a limit
 * rather than estimated.
 */
const ROOT = process.cwd();

function countMatches(dir: string, pattern: RegExp, extension: string) {
  const files = readdirSync(join(ROOT, dir)).filter((file) => file.endsWith(extension));
  const total = files.reduce((sum, file) => {
    const text = readFileSync(join(ROOT, dir, file), "utf8");
    return sum + (text.match(pattern)?.length ?? 0);
  }, 0);
  return { files: files.length, total };
}

const e2e = countMatches("tests/e2e", /^\s*test\(/gm, ".spec.ts");
const unit = countMatches("tests/unit", /^\s*it\(/gm, ".test.ts");

export const colophonStats = {
  /** Exact: one file per subject under test. */
  e2eSpecFiles: e2e.files,
  /** Exact: vitest reports the same number, because none are generated. */
  unitTests: unit.total,
  unitSpecFiles: unit.files,
  /** Runtime dependencies. Everything a visitor's browser might pay for. */
  dependencies: Object.keys(pkg.dependencies ?? {}).length,
  devDependencies: Object.keys(pkg.devDependencies ?? {}).length,
} as const;

/**
 * The stack, with what each piece is actually for.
 *
 * Selected, not exhaustive — 26 runtime dependencies is a list nobody reads.
 * These are the ones that decide how the site behaves, and each version is read
 * from package.json rather than written here, so a bump cannot leave this page
 * claiming the old one.
 */
const version = (name: string) =>
  (pkg.dependencies as Record<string, string>)[name]?.replace(/^[\^~]/, "") ?? "—";

export const stack = [
  {
    name: "Astro",
    version: version("astro"),
    role: "Static by default. Every route but /contact is prerendered HTML.",
  },
  {
    name: "Tailwind CSS",
    version: version("tailwindcss"),
    role: "Design tokens in one file, consumed as utilities.",
  },
  {
    name: "React",
    version: version("react"),
    role: "One island, on /contact. Nothing else on the site hydrates.",
  },
  {
    name: "Zod",
    version: version("zod"),
    role: "The contact schema, shared by the browser and the server action.",
  },
  {
    name: "Resend",
    version: version("resend"),
    role: "Delivers the contact email. See /privacy for what it receives.",
  },
  {
    name: "Upstash",
    version: version("@upstash/ratelimit"),
    role: "Five contact submissions an hour, per IP.",
  },
  {
    name: "Satori + resvg",
    version: version("satori"),
    role: "Open Graph cards, rendered at build time rather than by a service.",
  },
] as const;
