import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";
import { z } from "zod";

import { DEFAULT_LENS, getLens, type LensKey } from "@/lib/lenses";
import type { LoadedProject, ProjectMeta } from "@/types/project";

const PROJECTS_DIR = path.join(process.cwd(), "content/projects");

const frontMatterSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  stack: z.array(z.string().min(1)).min(1),
  role: z.string().optional(),
  period: z.string().min(1),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  featured: z.boolean().optional(),
  featuredOrder: z.number().optional(),
  /** Work-in-progress: visible in `next dev`, hidden from production builds. */
  draft: z.boolean().optional(),
  /**
   * Live-demo screenshot for the featured showcase, e.g.
   * "/projects/screenshots/<slug>.png". Captured via `npm run shots`.
   */
  screenshot: z.string().startsWith("/").optional(),
  /**
   * Terminal-readout lines shown in the featured showcase when a project has
   * no UI to screenshot (e.g. an HPC/CLI project). Keep to 3-4 short lines.
   */
  terminal: z.array(z.string().min(1)).max(5).optional(),
  /** Optional headline numbers shown as an inline metric strip on the detail page. */
  metrics: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .optional(),
  links: z
    .object({
      github: z.string().url().optional(),
      demo: z.string().url().optional(),
      paper: z.string().url().optional(),
      report: z.string().url().optional(),
      pypi: z.string().url().optional(),
    })
    .optional(),
});

let cache: LoadedProject[] | null = null;

async function loadAll(): Promise<LoadedProject[]> {
  if (cache && process.env.NODE_ENV === "production") return cache;

  const files = await fs.readdir(PROJECTS_DIR);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

  const loaded = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = await fs.readFile(path.join(PROJECTS_DIR, file), "utf8");
      const { data, content } = matter(raw);

      const parsed = frontMatterSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(
          `Invalid front matter in content/projects/${file}: ${parsed.error.message}`,
        );
      }

      return {
        slug,
        ...parsed.data,
        content,
        readingTime: readingTime(content).text,
      } satisfies LoadedProject;
    }),
  );

  // Drafts are authored and previewed in `next dev` but never published.
  const visible =
    process.env.NODE_ENV === "production"
      ? loaded.filter((project) => !project.draft)
      : loaded;

  visible.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  cache = visible;
  return visible;
}

export async function getAllProjects(): Promise<LoadedProject[]> {
  return loadAll();
}

export async function getProjectMeta(): Promise<ProjectMeta[]> {
  const all = await loadAll();
  return all.map(({ content, readingTime, ...meta }) => meta);
}

export async function getProjectBySlug(slug: string): Promise<LoadedProject | null> {
  const all = await loadAll();
  return all.find((p) => p.slug === slug) ?? null;
}

/**
 * Featured projects for a role lens, in the registry's declared order. The
 * lens's `featured` slug list (from content/projects/registry.json) is the
 * source of truth; `validate:projects` guarantees every slug exists and is
 * shipped, so the map below never drops or reorders silently.
 */
export async function getFeaturedProjects(
  lens: LensKey = DEFAULT_LENS,
): Promise<LoadedProject[]> {
  const all = await loadAll();
  const bySlug = new Map(all.map((project) => [project.slug, project]));
  return getLens(lens)
    .featured.map((slug) => bySlug.get(slug))
    .filter((project): project is LoadedProject => Boolean(project));
}

export async function getAllStacks(): Promise<string[]> {
  const all = await loadAll();
  const set = new Set<string>();
  for (const project of all) {
    for (const tech of project.stack) set.add(tech);
  }
  return Array.from(set).sort();
}

/** Adjacent projects (next/prev) for the detail page footer. */
export async function getAdjacentProjects(slug: string) {
  const all = await loadAll();
  const index = all.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
  };
}
