/**
 * Work in progress shown in the "Now building" strip on the home page.
 * These are private repos with no public artifact yet — name and one-liner
 * only, no links. Remove an entry when its project page ships (it then
 * belongs in content/projects/ instead).
 *
 * Source of truth: content/projects/registry.json. A project that is genuinely
 * in progress carries `status: "building"` there and belongs in this strip
 * only until it ships; `validate:projects` enforces the status vocabulary.
 * Everything in the registry today is `shipped` or `archived`, so this is empty
 * and the strip hides itself.
 *
 * Ported verbatim from src/lib/now-building.ts. It was missed on the first pass
 * precisely because the array is empty: a component that renders nothing looks
 * identical to a component that was never written, and nothing asserted the
 * difference. tests/e2e/home.spec.ts now renders the strip from a fixture so
 * the markup is exercised even while the real list is empty.
 */
export interface NowBuildingEntry {
  name: string;
  /** One honest line — what it is, not what it might become. */
  blurb: string;
}

export const nowBuilding: readonly NowBuildingEntry[] = [] as const;
