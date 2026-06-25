import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { IndexMark } from "@/components/layout/index-mark";
import { FadeIn, STAGGER_STEP } from "@/components/motion/fade-in";
import { ProjectFilter } from "@/components/projects/project-filter";
import { Badge } from "@/components/ui/badge";
import { getAllProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Evaluation harnesses, AI-safety work, and data products — each with a full write-up of the methods and numbers.",
  alternates: { canonical: "/projects" },
};

interface ProjectsPageProps {
  searchParams: Promise<{ stack?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { stack } = await searchParams;
  const all = await getAllProjects();

  // Catalog number is assigned on the full list so it stays stable under filtering.
  const numbered = all.map((project, i) => ({ project, index: i + 1 }));

  // Offer filters only for stacks shared by two or more projects — keeps the bar tidy.
  const freq = new Map<string, number>();
  for (const p of all) for (const s of p.stack) freq.set(s, (freq.get(s) ?? 0) + 1);
  const filterStacks = [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([s]) => s)
    .slice(0, 10);

  const activeStack = stack && filterStacks.includes(stack) ? stack : null;
  const shown = activeStack
    ? numbered.filter(({ project }) => project.stack.includes(activeStack))
    : numbered;

  return (
    <Container className="py-12 sm:py-16">
      <IndexMark
        mark="Index"
        label={`${shown.length} project${shown.length === 1 ? "" : "s"}`}
      />
      <h1 className="font-display mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Projects
      </h1>
      <p className="text-muted-foreground mt-3 max-w-prose text-lg leading-relaxed text-pretty">
        Evaluation harnesses, AI-safety work, and data products. Filter by stack — every
        card links to a full write-up with the methods and numbers.
      </p>

      <div className="border-border mt-8 border-y py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="text-muted-foreground shrink-0 font-mono text-xs tracking-wider uppercase">
            Filter by stack
          </span>
          <ProjectFilter stacks={filterStacks} active={activeStack} />
        </div>
      </div>

      {shown.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {shown.map(({ project, index }, i) => (
            <li key={project.slug}>
              <FadeIn delay={i * STAGGER_STEP}>
                <article className="group border-border bg-card hover:border-foreground/20 hover:shadow-lift relative flex h-full flex-col rounded-lg border p-6 shadow-xs transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5">
                  <div className="text-muted-foreground flex items-center justify-between font-mono text-xs">
                    <span className="text-primary">{String(index).padStart(2, "0")}</span>
                    <span>
                      {project.period} · {project.readingTime}
                    </span>
                  </div>
                  <h2 className="font-display mt-4 text-lg font-semibold tracking-tight">
                    <Link
                      href={`/projects/${project.slug}`}
                      className="after:absolute after:inset-0 after:rounded-lg"
                    >
                      {project.title}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground mt-2 line-clamp-3 flex-1 text-sm leading-relaxed">
                    {project.summary}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {project.stack.slice(0, 4).map((tech) => (
                      <Badge key={tech} variant="tag">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-primary mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                    Read write-up
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </article>
              </FadeIn>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-border mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <Search className="text-muted-foreground size-8" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium">No projects with that stack — yet.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Try another filter, or{" "}
            <Link
              href="/projects"
              className="text-primary font-medium underline-offset-2 hover:underline"
            >
              clear it
            </Link>
            .
          </p>
        </div>
      )}
    </Container>
  );
}
