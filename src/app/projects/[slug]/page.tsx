import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import { ArrowLeft, ExternalLink, FileText, Github, ScrollText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdjacentProjects, getAllProjects, getProjectBySlug } from "@/lib/projects";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

/** Trim a project summary to a search-friendly meta description (~155 chars). */
function toMetaDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  const description = toMetaDescription(project.summary);
  return {
    title: project.title,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description,
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const { content } = await compileMDX({
    source: project.content,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: { dark: "github-dark-default", light: "github-light-default" },
              keepBackground: false,
            },
          ],
        ],
      },
    },
  });

  const all = await getAllProjects();
  const number = String(all.findIndex((p) => p.slug === slug) + 1).padStart(2, "0");
  const { prev, next } = await getAdjacentProjects(slug);

  return (
    <article>
      <Container className="py-12 sm:py-16" size="sm">
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All projects
        </Link>

        <header className="mt-6">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
            <span className="text-primary">[ {number} ]</span>
            <span>{project.period}</span>
            {project.role ? (
              <>
                <span className="bg-border h-3 w-px" aria-hidden="true" />
                <span>{project.role}</span>
              </>
            ) : null}
            <span className="bg-border h-3 w-px" aria-hidden="true" />
            <span>{project.readingTime}</span>
          </div>

          <h1 className="font-display mt-4 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
            {project.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
            {project.summary}
          </p>

          <ul className="mt-5 flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <li key={tech}>
                <Badge variant="tag">{tech}</Badge>
              </li>
            ))}
          </ul>

          {project.links && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {project.links.github && (
                <Button asChild size="sm">
                  <Link
                    href={project.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github aria-hidden="true" />
                    Source
                  </Link>
                </Button>
              )}
              {project.links.demo && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={project.links.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink aria-hidden="true" />
                    Live demo
                  </Link>
                </Button>
              )}
              {project.links.report && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={project.links.report}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText aria-hidden="true" />
                    Report
                  </Link>
                </Button>
              )}
              {project.links.paper && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={project.links.paper}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ScrollText aria-hidden="true" />
                    Paper
                  </Link>
                </Button>
              )}
            </div>
          )}
        </header>

        <div className="ruler my-10" aria-hidden="true" />

        {project.metrics && project.metrics.length > 0 && (
          <div className="bg-border border-border grid grid-cols-3 gap-px overflow-hidden rounded-lg border">
            {project.metrics.map((metric) => (
              <div key={metric.label} className="bg-background p-4 text-center">
                <div className="font-mono text-2xl font-medium">{metric.value}</div>
                <div className="text-muted-foreground mt-1 font-mono text-[11px] tracking-wider uppercase">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="doc mt-10">{content}</div>

        <nav
          aria-label="Project navigation"
          className="border-border mt-14 grid gap-3 border-t pt-8 sm:grid-cols-2"
        >
          {prev ? (
            <Link
              href={`/projects/${prev.slug}`}
              className="border-border hover:border-foreground/20 flex flex-col rounded-lg border p-4 transition-[border-color,box-shadow] duration-150 hover:shadow-xs"
            >
              <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
                ← Previous
              </span>
              <span className="font-display mt-1 font-semibold">{prev.title}</span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {next ? (
            <Link
              href={`/projects/${next.slug}`}
              className="border-border hover:border-foreground/20 flex flex-col rounded-lg border p-4 text-right transition-[border-color,box-shadow] duration-150 hover:shadow-xs sm:items-end"
            >
              <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
                Next →
              </span>
              <span className="font-display mt-1 font-semibold">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </Container>
    </article>
  );
}
