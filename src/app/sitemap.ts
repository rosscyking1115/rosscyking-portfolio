import type { MetadataRoute } from "next";

import { getAllProjects } from "@/lib/projects";
import { siteConfig } from "@/lib/site-config";

// Role lenses are in-place views of the home page (via ?lens=), not separate
// URLs, so the home entry covers them.
const STATIC_ROUTES = ["", "/projects", "/about", "/contact"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1.0 : 0.7,
  }));

  const projects = await getAllProjects();
  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${siteConfig.url}/projects/${project.slug}`,
    lastModified: new Date(project.publishedAt),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticEntries, ...projectEntries];
}
