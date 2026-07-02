import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ScreenshotFrame, TerminalFrame } from "@/components/home/evidence-frame";
import { Container } from "@/components/layout/container";
import { IndexMark } from "@/components/layout/index-mark";
import { FadeIn, STAGGER_STEP } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { nowBuilding } from "@/lib/now-building";
import { getFeaturedProjects, getProjectMeta } from "@/lib/projects";
import type { ProjectMeta } from "@/types/project";

/** Mono caption for the frame title bar: the visual's host, or a run label. */
function frameCaption(project: ProjectMeta): string {
  const source = project.links?.demo ?? project.links?.report;
  if (source) return new URL(source).hostname;
  return "run log";
}

function EvidenceVisual({ project, sizes }: { project: ProjectMeta; sizes: string }) {
  if (project.screenshot) {
    return (
      <ScreenshotFrame
        src={project.screenshot}
        alt={`Screenshot of the ${project.title} live demo`}
        caption={frameCaption(project)}
        live={Boolean(project.links?.demo)}
        sizes={sizes}
      />
    );
  }
  if (project.terminal?.length) {
    return <TerminalFrame lines={project.terminal} caption={frameCaption(project)} />;
  }
  return null;
}

export async function FeaturedProjects() {
  const [projects, all] = await Promise.all([getFeaturedProjects(), getProjectMeta()]);
  const allLabel = `All ${all.length} projects`;
  const [flagship, ...rest] = projects;

  return (
    <Container className="pb-20">
      <div className="flex items-end justify-between gap-6">
        <div>
          <IndexMark mark="01" label="Featured work" />
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance">
            Four projects, shown working
          </h2>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
            Numbered 01–04 by what I&rsquo;d want you to read first — not by date. The
            screenshots are the actual apps; every card links to the evidence.
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

      {flagship && (
        <FadeIn>
          <article className="group border-border bg-card hover:border-foreground/20 hover:shadow-lift relative mt-8 grid gap-6 rounded-lg border p-6 shadow-xs transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 lg:grid-cols-5 lg:gap-8 lg:p-8">
            <div className="flex flex-col lg:col-span-2">
              <div className="text-muted-foreground flex items-center justify-between font-mono text-xs">
                <span className="text-primary">01</span>
                <span>
                  {flagship.period} · {flagship.readingTime}
                </span>
              </div>
              <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight text-balance">
                <Link
                  href={`/projects/${flagship.slug}`}
                  className="after:absolute after:inset-0 after:rounded-lg"
                >
                  {flagship.title}
                </Link>
              </h3>
              <p className="text-muted-foreground mt-3 line-clamp-4 text-sm leading-relaxed">
                {flagship.summary}
              </p>
              {flagship.metrics && flagship.metrics.length > 0 && (
                <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                  {flagship.metrics.map((metric) => (
                    <div key={metric.label}>
                      <dt className="sr-only">{metric.label}</dt>
                      <dd className="font-mono text-sm">
                        <span className="text-foreground font-semibold">
                          {metric.value}
                        </span>{" "}
                        <span className="text-muted-foreground text-xs">
                          {metric.label}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-1.5">
                {flagship.stack.slice(0, 4).map((tech) => (
                  <Badge key={tech} variant="tag">
                    {tech}
                  </Badge>
                ))}
              </div>
              <span className="text-primary mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium">
                Read the write-up
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
            <div className="lg:col-span-3">
              <EvidenceVisual
                project={flagship}
                sizes="(min-width: 1024px) 55vw, (min-width: 640px) 90vw, 100vw"
              />
            </div>
          </article>
        </FadeIn>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((project, i) => (
          <FadeIn key={project.slug} delay={i * STAGGER_STEP}>
            <article className="group border-border bg-card hover:border-foreground/20 hover:shadow-lift relative flex h-full flex-col rounded-lg border p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5">
              <EvidenceVisual
                project={project}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
              />
              <div className="text-muted-foreground mt-4 flex items-center justify-between font-mono text-xs">
                <span className="text-primary">{String(i + 2).padStart(2, "0")}</span>
                <span>
                  {project.period} · {project.readingTime}
                </span>
              </div>
              <h3 className="font-display mt-2 text-lg font-semibold tracking-tight">
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
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {project.stack.slice(0, 3).map((tech) => (
                  <Badge key={tech} variant="tag">
                    {tech}
                  </Badge>
                ))}
              </div>
            </article>
          </FadeIn>
        ))}
      </div>

      <Link
        href="/projects"
        className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1.5 text-sm font-medium sm:hidden"
      >
        {allLabel}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>

      {nowBuilding.length > 0 && (
        <FadeIn>
          <aside
            aria-label="Now building"
            className="border-border mt-10 border-t border-dashed pt-6"
          >
            <IndexMark mark="//" label="Now building" />
            <ul className="mt-4 flex flex-col gap-2.5">
              {nowBuilding.map((entry) => (
                <li key={entry.name} className="flex items-baseline gap-3 text-sm">
                  <span className="relative flex size-2 shrink-0 self-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="font-mono text-[13px]">{entry.name}</span>
                  <span className="text-muted-foreground leading-relaxed">
                    {entry.blurb}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-3 text-xs">
              Private repos while in progress — each goes public when it ships.
            </p>
          </aside>
        </FadeIn>
      )}
    </Container>
  );
}
