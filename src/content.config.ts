import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

/**
 * Projects are loaded from `content/projects` at the REPO ROOT, not from a copy
 * inside astro/. There must only ever be one authored list: those MDX files plus
 * `content/projects/registry.json` are the canonical source, and
 * `scripts/validate-projects.mjs` gates them in CI. A second copy under astro/
 * would drift — which is exactly what that validator exists to prevent, and the
 * reason the registry was built in the first place (see HANDOFF-2026-07-17).
 *
 * The `../` in `base` shortens to `./content/projects` when astro/ is promoted
 * to the repo root.
 * https://docs.astro.build/en/guides/content-collections/
 *
 * The schema below is ported from the Next app's `frontMatterSchema` in
 * src/lib/projects.ts rather than re-derived by reading the files, which would
 * silently relax a constraint. Keep the two in step until Next is removed.
 */
const projects = defineCollection({
  loader: glob({ base: "./content/projects", pattern: "**/*.mdx" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    stack: z.array(z.string().min(1)).min(1),
    role: z.string().optional(),
    period: z.string().min(1),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    featured: z.boolean().optional(),
    featuredOrder: z.number().optional(),
    /** Work-in-progress: visible in dev, hidden from production builds. */
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
        github: z.url().optional(),
        demo: z.url().optional(),
        paper: z.url().optional(),
        report: z.url().optional(),
        pypi: z.url().optional(),
      })
      .optional(),
  }),
});

export const collections = { projects };
