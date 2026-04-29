import Link from "next/link";

import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export default function ProjectNotFound() {
  return (
    <Section
      size="lg"
      eyebrow="404"
      heading="Project not found"
      description="The project you're looking for doesn't exist or has been moved."
    >
      <Button asChild>
        <Link href="/projects">Back to projects</Link>
      </Button>
    </Section>
  );
}
