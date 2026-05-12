import { Download } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { FadeIn, STAGGER_STEP } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export function Hero() {
  return (
    <Container className="pt-16 pb-12 sm:pt-24 sm:pb-16">
      <FadeIn whenInView={false}>
        <span className="border-border bg-muted/40 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          {siteConfig.availability}
        </span>
      </FadeIn>

      <FadeIn whenInView={false} delay={STAGGER_STEP}>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
          {siteConfig.name}
        </h1>
      </FadeIn>

      <FadeIn whenInView={false} delay={STAGGER_STEP * 2}>
        <p className="text-muted-foreground mt-4 text-lg text-balance sm:text-xl">
          {siteConfig.role}
        </p>
      </FadeIn>

      <FadeIn whenInView={false} delay={STAGGER_STEP * 3}>
        <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg">
          {siteConfig.description}
        </p>
      </FadeIn>

      <FadeIn whenInView={false} delay={STAGGER_STEP * 4}>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/projects">View projects</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/cv.pdf" download="Cheng-Yuan-King-CV.pdf">
              <Download aria-hidden="true" />
              Download CV
            </Link>
          </Button>
        </div>
      </FadeIn>
    </Container>
  );
}
