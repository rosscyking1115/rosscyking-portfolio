import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { IndexMark } from "@/components/layout/index-mark";
import { Badge } from "@/components/ui/badge";
import { getFeaturedProjects, getProjectMeta } from "@/lib/projects";

export async function FeaturedProjects() {
  const [projects, all] = await Promise.all([getFeaturedProjects(), getProjectMeta()]);
  const allLabel = `All ${all.length} projects`;

  return (
    <Container className="pb-20">
      <div className="flex items-end justify-between gap-6">
        <div>
          <IndexMark mark="01" label="Featured work" />
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance">
            Four projects, in priority order
          </h2>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
            Numbered 01–04 by what I&rsquo;d want you to read first — not by date. The
            proof lives in the details on each.
          </p>
        </div>
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground hidden shrink-0 items-center gap-1.5 text-sm font-medium sm:inline-flex"
        >
          {allLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {projects.map((project, i) => (
          <article
            key={project.slug}
            className="group border-border bg-card hover:border-foreground/20 hover:shadow-lift relative flex flex-col rounded-lg border p-6 shadow-xs transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5"
          >
            <div className="text-muted-foreground flex items-center justify-between font-mono text-xs">
              <span className="text-primary">{String(i + 1).padStart(2, "0")}</span>
              <span>
                {project.period} · {project.readingTime}
              </span>
            </div>
            <h3 className="font-display mt-4 text-xl font-semibold tracking-tight">
              <Link
                href={`/projects/${project.slug}`}
                className="after:absolute after:inset-0 after:rounded-lg"
              >
                {project.title}
              </Link>
            </h3>
            <p className="text-muted-foreground mt-2 line-clamp-3 flex-1 text-sm leading-relaxed">
              {project.summary}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              {project.stack.slice(0, 4).map((tech) => (
                <Badge key={tech} variant="tag">
                  {tech}
                </Badge>
              ))}
            </div>
            <span className="text-primary mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
              Read the write-up
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </article>
        ))}
      </div>

      <Link
        href="/projects"
        className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1.5 text-sm font-medium sm:hidden"
      >
        {allLabel}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Container>
  );
}
