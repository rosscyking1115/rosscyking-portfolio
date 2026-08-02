import { getCollection, type CollectionEntry } from "astro:content";
import readingTime from "reading-time";

import registry from "../../content/projects/registry.json";

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
  const mark = (registry.projects as Record<string, { mark?: number }>)[slug]?.mark;
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
