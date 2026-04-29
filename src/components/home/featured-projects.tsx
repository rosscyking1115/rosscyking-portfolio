import Link from "next/link";

import { Section } from "@/components/layout/section";
import { ProjectGrid } from "@/components/projects/project-grid";
import { Button } from "@/components/ui/button";
import { getFeaturedProjects } from "@/lib/projects";

export async function FeaturedProjects() {
  const projects = await getFeaturedProjects();

  return (
    <Section
      eyebrow="Selected work"
      heading="Things I've built"
      description="A few projects that show how I approach distributed ML, LLM evaluation, and rigorous benchmarking. Full case studies on the projects page."
    >
      <ProjectGrid projects={projects} />

      <div className="mt-10 flex justify-start">
        <Button asChild variant="outline">
          <Link href="/projects">All projects →</Link>
        </Button>
      </div>
    </Section>
  );
}
