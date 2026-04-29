import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * Phase 0 placeholder homepage.
 * Phase 1 replaces this with the real hero, featured projects, and skills strip.
 */
export default function Home() {
  return (
    <Container className="py-20 sm:py-28">
      <p className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        {siteConfig.availability}
      </p>
      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
        {siteConfig.name}
      </h1>
      <p className="mt-4 text-balance text-lg text-muted-foreground sm:text-xl">
        {siteConfig.role}
      </p>
      <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
        {siteConfig.description}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/projects">View projects</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contact">Get in touch</Link>
        </Button>
      </div>
    </Container>
  );
}
