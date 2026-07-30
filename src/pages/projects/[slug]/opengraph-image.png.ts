import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";

import { pngResponse, ProjectCard, renderCard } from "../../../lib/og";

/**
 * Per-project OG cards, one static PNG per project, generated at build time.
 *
 * Next generated these on demand per request. Enumerating them through
 * getStaticPaths instead means zero serverless invocations and no cold start on
 * the first social scrape — and it fails the BUILD if a project's frontmatter
 * cannot produce a card, rather than 500ing later when a crawler happens by.
 *
 * Drafts are excluded, matching `loadAll()` in the Next app's src/lib/projects.ts.
 */
export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await getCollection("projects", ({ data }) => !data.draft);
  return projects.map((project) => ({
    params: { slug: project.id },
    props: {
      title: project.data.title,
      summary: project.data.summary,
      stack: project.data.stack,
    },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, summary, stack } = props as {
    title: string;
    summary: string;
    stack: string[];
  };
  return pngResponse(await renderCard(ProjectCard({ title, summary, stack })));
};
