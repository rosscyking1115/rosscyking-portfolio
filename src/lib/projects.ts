import { getCollection, type CollectionEntry } from "astro:content";
import readingTime from "reading-time";

import registry from "../../content/projects/registry.json";
import { testCount } from "./registry-stats";

/**
 * Project queries, ported from the Next app's src/lib/projects.ts.
 *
 * The Next version hand-rolled the loader: fs.readdir, gray-matter, a zod parse
 * and a module-level cache. All of that is now the content collection defined
 * in src/content.config.ts, so what is left here is only the querying.
 *
 * The ordering and draft rules are carried over exactly, because they are
 * observable: projects sort newest-first by `publishedAt`, and drafts are
 * authored in dev but never published.
 */

export type Project = CollectionEntry<"projects">;

/**
 * The three metric modes (design spec §03 R5), chosen by what is TRUE.
 *
 *   CORRECTED   a published number was withdrawn and replaced
 *   CONTROLLED  a null or negative result, carried by a positive control
 *   LIMITS      a result published with its documented limits
 *
 * Authored per project in registry.json and gated by validate-projects.mjs.
 * The spec is explicit that a correction is never fabricated to fill the slot,
 * so each mode is grounded in a heading that already exists in the write-up —
 * "The leakage audit — and the corrected number", "Making a null result mean
 * something", "Honest limits".
 */
export type MetricMode = "CORRECTED" | "CONTROLLED" | "LIMITS";

/**
 * The three content states (design spec §03 R6). Every project resolves to
 * exactly one, and all three are DERIVED rather than authored — a state anyone
 * can set by hand is a state that can disagree with the project it describes.
 */
export type ContentState = "LIVE" | "RUN LOG" | "ARCHIVED";

interface RegistryProject {
  /** The h2 that carries the project's argument — R9's MAJOR. See below. */
  major?: string;
  mark?: number;
  status?: string;
  demo?: string | null;
  headline?: {
    metric: string;
    mode: MetricMode;
    withdrawn?: string;
    control?: string;
  } | null;
}

/** The registry's project table, typed once so every reader below shares it. */
const REGISTRY = registry.projects as Record<string, RegistryProject>;

/** Reading time, computed the same way and with the same package as the Next app. */
export function projectReadingTime(entry: Project): string {
  return readingTime(entry.body ?? "").text;
}

/**
 * Every publishable project, newest first.
 *
 * `import.meta.env.PROD` stands in for the Next version's
 * `process.env.NODE_ENV === "production"` check. Drafts stay visible while
 * writing and disappear from the build.
 */
export async function getAllProjects(): Promise<Project[]> {
  const projects = await getCollection("projects", ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return projects.sort((a, b) => b.data.publishedAt.localeCompare(a.data.publishedAt));
}

/**
 * The canonical mark for a project — the number in `[ 05 ]`, wherever it shows.
 *
 * READ, NEVER COMPUTED, and that is the whole point. This used to be a
 * positional index, and it produced a mark that contradicted itself:
 *
 *   - home numbered by position within the LENS's featured array, so
 *     Agent Release Gates was `01` there;
 *   - /projects and the write-up numbered by a global publishedAt-descending
 *     sort, so the same project was `05` on both;
 *   - and because the sort is over the whole set, publishing an eleventh
 *     project silently renumbered all ten.
 *
 * IndexMark's own contract is that the mark is always TRUE — a priority, a
 * reading order, a location — so a number that disagrees with itself across
 * three surfaces, and moves whenever content is added, is a defect rather than
 * a cosmetic wrinkle. Found in the 2026-08-01 design audit.
 *
 * The values are frozen in registry.json and gated by validate-projects.mjs for
 * presence, uniqueness and contiguity. A lens or a sort may change ORDER; it
 * must never change the mark.
 */
export function projectMark(slug: string): number {
  const mark = REGISTRY[slug]?.mark;
  if (typeof mark !== "number") {
    throw new Error(
      `No canonical mark for "${slug}" in registry.json. Every project needs one — ` +
        `see the _mark note there, and validate-projects.mjs which gates it.`,
    );
  }
  return mark;
}

/** The mark as it is displayed: zero-padded to two digits. */
export function projectMarkLabel(slug: string): string {
  return String(projectMark(slug)).padStart(2, "0");
}

/** The headline number, its unit, and the evidence mode behind it. */
export interface Headline {
  value: string;
  label: string;
  mode: MetricMode;
  /**
   * The number this one replaced, present only when mode is CORRECTED, and
   * rendered struck through beside it. Half a correction — the new number with
   * no sign of the old — is just a confident number, which is what every other
   * portfolio has. Gated against the write-up body, so a correction has to have
   * been written about before it can be displayed.
   */
  withdrawn?: string;
  /**
   * The control this result is measured against, present only when mode is
   * CONTROLLED, and rendered beside it. The spec renders that mode as "result
   * vs control, side by side", and redteam-foundry's own write-up says why: "a
   * negative result only means something if the pipeline can detect a
   * positive." A 0–4% attack success with no 80% beside it is the unsupported
   * null the project exists to argue against.
   */
  control?: { value: string; label: string };
}

/**
 * The one number a project leads with in the index log, or null.
 *
 * The VALUE is never stored in the registry — only the label of a metric the
 * write-up already publishes. That is deliberate: a value repeated in two files
 * is a value that can drift, and `validate:projects` exists because this repo
 * has been bitten by exactly that. The registry names which metric leads; the
 * MDX owns what it says.
 *
 * Null is a real answer, not a failure. marketing-effectiveness-lab is archived
 * and publishes no metrics at all, so there is no number to lead with — its row
 * renders a designed empty cell. The designer's mock filled that slot with a
 * phrase lifted from the summary; the spec's own instruction is to mark the slot
 * rather than invent something plausible.
 */
export function projectHeadline(entry: Project): Headline | null {
  const spec = REGISTRY[entry.id]?.headline;
  if (!spec) return null;

  const metric = entry.data.metrics?.find((m) => m.label === spec.metric);
  if (!metric) {
    throw new Error(
      `"${entry.id}" pins headline metric "${spec.metric}", which its MDX does not publish. ` +
        `validate-projects.mjs gates this — run \`npm run validate:projects\`.`,
    );
  }
  const control = spec.control
    ? entry.data.metrics?.find((m) => m.label === spec.control)
    : undefined;
  if (spec.control && !control) {
    throw new Error(
      `"${entry.id}" pins control metric "${spec.control}", which its MDX does not publish. ` +
        `validate-projects.mjs gates this — run \`npm run validate:projects\`.`,
    );
  }

  return {
    value: metric.value,
    label: metric.label,
    mode: spec.mode,
    ...(spec.withdrawn ? { withdrawn: spec.withdrawn } : {}),
    ...(control ? { control: { value: control.value, label: control.label } } : {}),
  };
}

/**
 * Which of the three content states a project is in.
 *
 * Derived from facts the registry already gates, in priority order: archived
 * beats everything (an archived project with a live demo is a contradiction the
 * validator rejects), then a pinned demo means LIVE, and anything else is a run
 * log. This is why the home page's "6 live" and the index's state column cannot
 * disagree — they are the same function.
 */
/**
 * The heading that carries this project's argument — R9's MAJOR for the
 * write-up route.
 *
 * R9's allocation table calls it "Method". No write-up has a heading called
 * that: aerospace names it "The leakage audit — and the corrected number",
 * redteam-foundry "Why ASR, not refusal rate", tfl "The headline is certified,
 * not just published". Ten projects, ten names, one role — so the registry
 * records WHICH one, exactly as it records which metric is the headline, and
 * validate-projects.mjs fails the build if the heading is renamed away from
 * underneath it.
 *
 * Returns undefined rather than throwing: a project with no `major` renders as
 * all-MINOR, which is a page with no loudest section rather than a broken one.
 * The R9 gate is what says that is wrong; this is not the place to crash.
 */
export function projectMajorHeading(slug: string): string | undefined {
  return REGISTRY[slug]?.major;
}

export function projectState(slug: string): ContentState {
  const spec = REGISTRY[slug];
  if (spec?.status === "archived") return "ARCHIVED";
  return spec?.demo ? "LIVE" : "RUN LOG";
}

/**
 * The four sorts the projects log offers (design spec §04, /projects row).
 *
 * "Evidence note is a sortable column" is the thesis of that page: the metric
 * mode stops being a sentence in the prose and becomes an AXIS, so "corrected
 * first" is a thing a hiring manager can actually do. The other three are the
 * reading order, the size of the test suite, and whether there is something to
 * click.
 */
export const SORTS = ["order", "tests", "corrected", "live"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  order: "Reading order",
  tests: "Most tests",
  corrected: "Corrected first",
  live: "Live demo first",
};

/** Mode and state precedence, most-interesting first. Ties fall back to the mark. */
const MODE_RANK: Record<MetricMode, number> = { CORRECTED: 0, CONTROLLED: 1, LIMITS: 2 };
const STATE_RANK: Record<ContentState, number> = { LIVE: 0, "RUN LOG": 1, ARCHIVED: 2 };

/**
 * Every sort's position for every project, as CSS `order` values.
 *
 * SORTING IS CSS, NOT JAVASCRIPT. Each row carries all four ranks as custom
 * properties and a rule on `<html data-sort>` picks which one `order` reads, so
 * changing the sort moves nothing in the DOM: no re-render, no reflow of ten
 * subtrees, no hydration, and a shared `?sort=` link is correct before first
 * paint rather than after a script runs. It also means the sort cannot
 * disagree with the filter — they are independent attributes on the same
 * element rather than two passes over one list.
 */
export function sortRanks(projects: Project[]): Map<string, Record<Sort, number>> {
  const rank = (compare: (a: Project, b: Project) => number) => {
    const ordered = [...projects].sort(
      (a, b) => compare(a, b) || projectMark(a.id) - projectMark(b.id),
    );
    return new Map(ordered.map((project, index) => [project.id, index + 1]));
  };

  const byOrder = rank(() => 0);
  const byTests = rank((a, b) => testCount(b.id) - testCount(a.id));
  const byCorrected = rank((a, b) => {
    const modeRank = (project: Project) => {
      const headline = projectHeadline(project);
      // No headline sorts last: it is neither corrected nor uncorrected.
      return headline ? MODE_RANK[headline.mode] : 3;
    };
    return modeRank(a) - modeRank(b);
  });
  const byLive = rank(
    (a, b) => STATE_RANK[projectState(a.id)] - STATE_RANK[projectState(b.id)],
  );

  return new Map(
    projects.map((project) => [
      project.id,
      {
        order: byOrder.get(project.id)!,
        tests: byTests.get(project.id)!,
        corrected: byCorrected.get(project.id)!,
        live: byLive.get(project.id)!,
      },
    ]),
  );
}

/**
 * Every publishable project with its canonical mark, in display order.
 *
 * `index` is the MARK, not the position — two projects adjacent in this list
 * can carry non-adjacent marks once a project is retired, and that is correct.
 */
export async function getNumberedProjects(): Promise<
  Array<{ project: Project; index: number }>
> {
  const all = await getAllProjects();
  return all.map((project) => ({ project, index: projectMark(project.id) }));
}

/**
 * Stacks worth offering as filters: those shared by two or more projects,
 * most common first, capped at ten. Ported verbatim — it keeps the chip bar
 * from turning into a wall of one-offs.
 */
export async function getFilterStacks(): Promise<string[]> {
  const all = await getAllProjects();
  const frequency = new Map<string, number>();
  for (const project of all) {
    for (const stack of project.data.stack) {
      frequency.set(stack, (frequency.get(stack) ?? 0) + 1);
    }
  }
  return [...frequency.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([stack]) => stack)
    .slice(0, 10);
}

/**
 * How many published projects use each tool, keyed by the stack string.
 *
 * The provenance toolbox on /about is built from this. The design spec is blunt
 * about why it has to exist: "the toolbox was the least honest thing on the
 * site … a bare skills list is a claim with nothing behind it — on a site whose
 * argument is that every number traces to the test that produced it, that stood
 * out."
 *
 * So a tool either has projects behind it, in which case the count is derived
 * here and links to the filtered log, or it has none and cannot pretend
 * otherwise. Nothing about the count is authored.
 */
export async function stackCounts(): Promise<Map<string, number>> {
  const all = await getAllProjects();
  const counts = new Map<string, number>();
  for (const project of all) {
    for (const tool of project.data.stack) {
      counts.set(tool, (counts.get(tool) ?? 0) + 1);
    }
  }
  return counts;
}

/** The neighbours either side of a project, for the prev/next footer nav. */
export async function getAdjacentProjects(slug: string): Promise<{
  prev: Project | null;
  next: Project | null;
}> {
  const all = await getAllProjects();
  const index = all.findIndex((project) => project.id === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: all[index - 1] ?? null,
    next: all[index + 1] ?? null,
  };
}

/** Trim a project summary to a search-friendly meta description (~155 chars). */
export function toMetaDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/**
 * Featured cards for every lens, keyed by lens, in the registry's declared
 * order. Ported from `getLensFeaturedCards` in the Next app's src/lib/projects.ts.
 *
 * The Next version built this so a React client component could re-rank in
 * place without navigating. Here it feeds one prerendered panel per lens, which
 * CSS shows or hides — same idea, no hydration.
 *
 * `validate:projects` guarantees every lens slug exists and is shipped, so the
 * lookup below can never silently drop a card.
 */
export async function getLensFeaturedCards(): Promise<Record<string, Project[]>> {
  const { LENS_KEYS, getLens } = await import("./lenses");
  const all = await getAllProjects();
  const bySlug = new Map(all.map((project) => [project.id, project]));

  return Object.fromEntries(
    LENS_KEYS.map((key) => [
      key,
      getLens(key)
        .featured.map((slug) => bySlug.get(slug))
        .filter((project): project is Project => Boolean(project)),
    ]),
  );
}
