import type { MetadataRoute } from "next";

import { DEFAULT_LENS, LENS_KEYS } from "@/lib/lenses";
import { getAllProjects } from "@/lib/projects";
import { siteConfig } from "@/lib/site-config";

const STATIC_ROUTES = ["", "/projects", "/about", "/contact"] as const;

// Shareable role-lens pages (the default lens is the home page itself).
const LENS_ROUTES = LENS_KEYS.filter((lens) => lens !== DEFAULT_LENS).map(
  (lens) => `/for/${lens}`,
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1.0 : 0.7,
  }));

  const lensEntries: MetadataRoute.Sitemap = LENS_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projects = await getAllProjects();
  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${siteConfig.url}/projects/${project.slug}`,
    lastModified: new Date(project.publishedAt),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticEntries, ...lensEntries, ...projectEntries];
}
