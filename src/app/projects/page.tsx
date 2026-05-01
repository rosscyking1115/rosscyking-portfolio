import type { Metadata } from "next";

import { Section } from "@/components/layout/section";
import { ProjectFilter } from "@/components/projects/project-filter";
import { ProjectGrid } from "@/components/projects/project-grid";
import { getAllStacks, getProjectMeta } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Selected work — distributed ML, LLM evaluation, NLP pipelines, and applied data engineering.",
  alternates: { canonical: "/projects" },
};

interface ProjectsPageProps {
  searchParams: Promise<{ stack?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { stack } = await searchParams;
  const allStacks = await getAllStacks();
  const allProjects = await getProjectMeta();

  const activeStack = stack && allStacks.includes(stack) ? stack : null;

  const filtered = activeStack
    ? allProjects.filter((project) => project.stack.includes(activeStack))
    : allProjects;

  return (
    <Section
      headingAs="h1"
      size="lg"
      eyebrow="Selected work"
      heading="Projects"
      description="A few representative builds. Filter by stack to narrow down."
    >
      <ProjectFilter stacks={allStacks} active={activeStack} />
      <ProjectGrid
        projects={filtered}
        emptyMessage={
          activeStack
            ? `Nothing tagged "${activeStack}" yet.`
            : "No projects yet — check back soon."
        }
      />
    </Section>
  );
}
