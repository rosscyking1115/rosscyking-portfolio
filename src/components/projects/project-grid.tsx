import { FadeIn, STAGGER_STEP } from "@/components/motion/fade-in";
import { ProjectCard } from "@/components/projects/project-card";
import type { ProjectMeta } from "@/types/project";

interface ProjectGridProps {
  projects: readonly ProjectMeta[];
  /** Empty-state message shown when no projects match a filter. */
  emptyMessage?: string;
}

export function ProjectGrid({
  projects,
  emptyMessage = "No projects match that filter yet.",
}: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <li key={project.slug}>
          <FadeIn delay={index * STAGGER_STEP}>
            <ProjectCard project={project} />
          </FadeIn>
        </li>
      ))}
    </ul>
  );
}
