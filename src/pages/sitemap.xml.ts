import type { APIRoute } from "astro";

import { getAllProjects } from "../lib/projects";
import { siteConfig } from "../lib/site-config";

/**
 * Hand-rolled rather than using @astrojs/sitemap.
 *
 * Phase 1 gate 5 diffs this against a sitemap captured from production, so the
 * URL set and the per-entry changefreq/priority have to match what next's
 * MetadataRoute.Sitemap emits today. The integration produces its own shape and
 * gives no per-route control over those fields, which would fail the gate for
 * no benefit.
 *
 * Ported from src/app/sitemap.ts.
 */
export const prerender = true;

// Role lenses are in-place views of the home page (via ?lens=), not separate
// URLs, so the home entry covers them.
const STATIC_ROUTES = ["", "/projects", "/about", "/contact"] as const;

export const GET: APIRoute = async () => {
  const now = new Date().toISOString();
  const projects = await getAllProjects();

  const entries = [
    ...STATIC_ROUTES.map((path) => ({
      url: `${siteConfig.url}${path}`,
      lastmod: now,
      changefreq: path === "" ? "weekly" : "monthly",
      priority: path === "" ? "1" : "0.7",
    })),
    ...projects.map((project) => ({
      url: `${siteConfig.url}/projects/${project.id}`,
      lastmod: new Date(project.data.publishedAt).toISOString(),
      changefreq: "yearly",
      priority: "0.6",
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `<url>
<loc>${entry.url}</loc>
<lastmod>${entry.lastmod}</lastmod>
<changefreq>${entry.changefreq}</changefreq>
<priority>${entry.priority}</priority>
</url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
