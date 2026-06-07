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
      heading="Selected technical projects"
      description="Representative projects in AI safety evaluation, LLM red-teaming, RAG benchmarking, and reproducible evaluation infrastructure. Full case studies on the projects page."
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
