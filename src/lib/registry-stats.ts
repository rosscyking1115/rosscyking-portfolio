import registry from "../../content/projects/registry.json";

/**
 * Headline proof numbers, computed from the canonical registry at build time so
 * they can never drift from the project set. Only shipped projects count; test
 * totals sum every metric whose label mentions "test" (leading integer parsed,
 * so "150+" counts as 150).
 *
 * Ported verbatim from src/lib/registry-stats.ts. The registry is read from the
 * repo root, matching content.config.ts and lenses.ts — one authored list.
 */

interface ProjectSpec {
  status: string;
  demo: string | null;
  metrics?: Record<string, string>;
}

const entries = Object.entries(registry.projects) as Array<[string, ProjectSpec]>;
const shipped = entries.filter(([, p]) => p.status === "shipped");

/**
 * Tests attributable to one project — the same sum, per project, that
 * `proofStats.tests` performs over the whole set.
 *
 * EXPORTED SO THE TWO CANNOT DISAGREE, which is §03 R8: "numbers are counted,
 * not typed … a hand-written total is a number that can drift." The designer's
 * mock is the worked example of what happens otherwise — it gave neobank a row
 * reading 617 tests while its own footer said 1,681, and the two are only
 * reconcilable if neobank counts as 217. 617 is the MDX metrics summed
 * (217 dbt + 400 pytest); 1,681 is the REGISTRY pins summed. Both are real
 * numbers about the same project, which is exactly why only one of them may be
 * the source.
 *
 * The registry pins are the source, because they are the set gated against the
 * repo by validate-projects.mjs. A metric that exists only in the MDX has been
 * published but not pinned.
 */
export function testCount(slug: string): number {
  const spec = (registry.projects as Record<string, ProjectSpec>)[slug];
  let sum = 0;
  for (const [label, value] of Object.entries(spec?.metrics ?? {})) {
    if (!/test/i.test(label)) continue;
    const n = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}

export const proofStats = {
  shipped: shipped.length,
  tests: shipped.reduce((sum, [slug]) => sum + testCount(slug), 0),
  demos: shipped.filter(([, p]) => p.demo).length,
} as const;
