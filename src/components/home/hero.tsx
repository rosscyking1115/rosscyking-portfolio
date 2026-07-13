import { ArrowRight, Download, Github, Linkedin } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { IndexMark } from "@/components/layout/index-mark";
import { FadeIn, STAGGER_STEP } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

const ROLES = ["Data Engineering", "ML Engineering", "AI Safety & Evaluation"] as const;

export function Hero() {
  return (
    <Container className="pt-16 pb-16 sm:pt-24 sm:pb-20">
      <div className="max-w-3xl">
        <FadeIn whenInView={false}>
          <span className="border-border bg-background inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-2.5 text-xs font-medium">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {siteConfig.availability}
          </span>
        </FadeIn>

        <FadeIn whenInView={false} delay={STAGGER_STEP}>
          <IndexMark mark={siteConfig.shortName} label="Sheffield, UK" className="mt-7" />
        </FadeIn>

        <FadeIn whenInView={false} delay={STAGGER_STEP * 2}>
          <h1 className="font-display mt-4 text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            I turn ambiguous data and AI problems into{" "}
            <span className="text-primary">measurable systems.</span>
          </h1>
        </FadeIn>

        <FadeIn whenInView={false} delay={STAGGER_STEP * 3}>
          <p className="text-muted-foreground mt-6 max-w-prose text-lg leading-relaxed text-pretty">
            {siteConfig.description}
          </p>
        </FadeIn>

        <FadeIn whenInView={false} delay={STAGGER_STEP * 4}>
          <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Roles&nbsp;→
            </span>
            {ROLES.map((role) => (
              <span
                key={role}
                className="bg-muted rounded px-2 py-0.5 font-mono text-[11px]"
              >
                {role}
              </span>
            ))}
          </div>
        </FadeIn>

        <FadeIn whenInView={false} delay={STAGGER_STEP * 5}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/projects">
                View projects
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/cv.pdf" download="Cheng-Yuan-King-CV.pdf">
                <Download aria-hidden="true" />
                Download CV
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github aria-hidden="true" />
                GitHub
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link
                href={siteConfig.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin aria-hidden="true" />
                LinkedIn
              </Link>
            </Button>
          </div>
        </FadeIn>
      </div>

      <div className="ruler mt-16" aria-hidden="true" />
    </Container>
  );
}
