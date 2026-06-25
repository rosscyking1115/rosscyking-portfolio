import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";
import { z } from "zod";

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

  loaded.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  cache = loaded;
  return loaded;
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

export async function getFeaturedProjects(): Promise<LoadedProject[]> {
  const all = await loadAll();
  return all
    .filter((p) => p.featured)
    .sort((a, b) => {
      const orderA = a.featuredOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.featuredOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
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
