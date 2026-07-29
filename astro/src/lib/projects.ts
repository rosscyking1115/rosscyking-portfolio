import { getCollection, type CollectionEntry } from "astro:content";
import readingTime from "reading-time";

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
 * Catalogue numbers, assigned over the FULL list so a project keeps its number
 * when the gallery is filtered — the Next page did the same, deliberately.
 */
export async function getNumberedProjects(): Promise<
  Array<{ project: Project; index: number }>
> {
  const all = await getAllProjects();
  return all.map((project, i) => ({ project, index: i + 1 }));
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
