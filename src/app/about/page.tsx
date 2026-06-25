import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";

import { ExperienceTimeline } from "@/components/about/experience-timeline";
import { Container } from "@/components/layout/container";
import { IndexMark } from "@/components/layout/index-mark";
import { getAboutContent } from "@/lib/about";
import { education, languages } from "@/lib/experience";
import { siteConfig } from "@/lib/site-config";
import { skillGroups } from "@/lib/skills";

export const metadata: Metadata = {
  title: "About",
  description:
    "MSc Artificial Intelligence at the University of Sheffield, building AI evaluation systems and data products across AI safety, evaluation, and data science.",
  alternates: { canonical: "/about" },
};

// Languages live in their own sidebar block, so drop that group from the toolbox.
const toolboxGroups = skillGroups.filter((group) => group.label !== "Languages");

export default async function AboutPage() {
  const source = await getAboutContent();
  const { content } = await compileMDX({ source });

  return (
    <Container className="py-12 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
        {/* Bio + education */}
        <div className="max-w-prose">
          <IndexMark mark="About" label={siteConfig.name} />
          <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            I make AI reliability something you can measure.
          </h1>

          <div className="text-muted-foreground [&_a]:text-primary [&_strong]:text-foreground mt-6 text-lg leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&>p+p]:mt-4">
            {content}
          </div>

          <div className="ruler my-12" aria-hidden="true" />

          <IndexMark mark="01" label="Education" />
          <ExperienceTimeline items={education} />
        </div>

        {/* Toolbox + languages */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border-border rounded-lg border p-6">
            <IndexMark mark="02" label="Toolbox" />
            <div className="mt-5 space-y-5">
              {toolboxGroups.map((group) => (
                <div key={group.label}>
                  <div className="text-primary font-mono text-[11px] tracking-wider uppercase">
                    {group.label}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="border-border bg-background rounded border px-2 py-0.5 text-xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-border my-6 h-px w-full" />

            <IndexMark mark="03" label="Languages" />
            <ul className="mt-4 space-y-2.5 text-sm">
              {languages.map((language) => (
                <li
                  key={language.name}
                  className="flex items-center justify-between gap-3"
                >
                  <span>{language.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {language.level}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}
