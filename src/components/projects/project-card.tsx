import { ArrowUpRight, Github } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  /** When true, the whole card surface becomes a link to the project detail page. */
  linkToDetail?: boolean;
}

export function ProjectCard({ project, linkToDetail = true }: ProjectCardProps) {
  const detailHref = `/projects/${project.slug}`;

  return (
    <Card className="group hover:border-foreground/30 relative flex h-full flex-col transition-colors">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="leading-snug">
            {linkToDetail ? (
              <Link
                href={detailHref}
                className="after:absolute after:inset-0 after:rounded-xl"
              >
                {project.title}
              </Link>
            ) : (
              project.title
            )}
          </CardTitle>
          <ArrowUpRight
            className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </div>
        <p className="text-muted-foreground text-xs">{project.period}</p>
        <CardDescription>{project.summary}</CardDescription>
      </CardHeader>

      <CardContent className="mt-auto flex flex-col gap-4">
        <ul className="flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <li key={tech}>
              <Badge variant="muted">{tech}</Badge>
            </li>
          ))}
        </ul>

        {project.links?.github && (
          <Link
            href={project.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground relative z-10 inline-flex w-fit items-center gap-1.5 text-xs"
          >
            <Github className="size-3.5" aria-hidden="true" />
            View source
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
