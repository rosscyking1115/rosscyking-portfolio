import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import { ArrowLeft, ArrowRight, ExternalLink, Github, ScrollText } from "lucide-react";
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

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.summary,
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

  const { prev, next } = await getAdjacentProjects(slug);

  return (
    <article>
      <Container className="py-12 sm:py-16" size="md">
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All projects
        </Link>

        <header className="mt-6">
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            {project.period}
            {project.role ? ` · ${project.role}` : null} · {project.readingTime}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {project.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg text-pretty">
            {project.summary}
          </p>

          <ul className="mt-5 flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <li key={tech}>
                <Badge variant="muted">{tech}</Badge>
              </li>
            ))}
          </ul>

          {project.links && (
            <div className="mt-6 flex flex-wrap gap-2">
              {project.links.github && (
                <Button asChild variant="outline" size="sm">
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

        <div className="prose prose-neutral dark:prose-invert prose-headings:tracking-tight prose-h2:text-2xl prose-h3:text-xl prose-a:underline prose-a:underline-offset-4 prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-muted/40 mt-10 max-w-none">
          {content}
        </div>

        <nav
          aria-label="Project navigation"
          className="border-border mt-16 grid gap-3 border-t pt-8 sm:grid-cols-2"
        >
          {prev ? (
            <Link
              href={`/projects/${prev.slug}`}
              className="border-border hover:border-foreground/40 flex flex-col rounded-lg border p-4 transition-colors"
            >
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <ArrowLeft className="size-3" aria-hidden="true" /> Newer
              </span>
              <span className="mt-1 font-medium">{prev.title}</span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {next ? (
            <Link
              href={`/projects/${next.slug}`}
              className="border-border hover:border-foreground/40 flex flex-col rounded-lg border p-4 text-right transition-colors sm:items-end"
            >
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                Older <ArrowRight className="size-3" aria-hidden="true" />
              </span>
              <span className="mt-1 font-medium">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </Container>
    </article>
  );
}
