import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import { Mail } from "lucide-react";
import Link from "next/link";

import { CvDownload } from "@/components/about/cv-download";
import { ExperienceTimeline } from "@/components/about/experience-timeline";
import { Section } from "@/components/layout/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAboutContent } from "@/lib/about";
import { education, languages } from "@/lib/experience";
import { siteConfig } from "@/lib/site-config";
import { skillGroups } from "@/lib/skills";

export const metadata: Metadata = {
  title: "About",
  description:
    "MSc Artificial Intelligence at the University of Sheffield. Background, focus areas, and how to get in touch.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const source = await getAboutContent();
  const { content } = await compileMDX({ source });

  return (
    <article>
      {/* Header */}
      <Section
        headingAs="h1"
        size="lg"
        eyebrow="About"
        heading="Cheng-Yuan (Ross) King"
        description="MSc Artificial Intelligence · Applied ML, NLP, scalable systems"
      >
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <CvDownload />
          <Button asChild variant="outline">
            <Link href={`mailto:${siteConfig.email}`}>
              <Mail aria-hidden="true" />
              Email me
            </Link>
          </Button>
        </div>
      </Section>

      {/* Bio */}
      <Section size="md" containerSize="md">
        <div className="prose prose-neutral dark:prose-invert prose-a:underline prose-a:underline-offset-4 max-w-none">
          {content}
        </div>
      </Section>

      {/* Education */}
      <Section size="md" containerSize="md" heading="Education">
        <ExperienceTimeline items={education} />
      </Section>

      {/* Skills */}
      <Section size="md" containerSize="md" heading="Toolbox">
        <dl className="grid gap-8 sm:grid-cols-2">
          {skillGroups.map((group) => (
            <div key={group.label}>
              <dt className="text-foreground mb-3 text-sm font-semibold">
                {group.label}
              </dt>
              <dd>
                <ul className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <li key={item}>
                      <Badge variant="outline">{item}</Badge>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Languages */}
      <Section size="md" containerSize="md" heading="Languages">
        <ul className="flex flex-wrap gap-2">
          {languages.map((language) => (
            <li
              key={language.name}
              className="border-border inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
            >
              <span className="font-medium">{language.name}</span>
              <span className="text-muted-foreground">{language.level}</span>
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}
