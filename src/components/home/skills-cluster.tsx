import { Section } from "@/components/layout/section";
import { FadeIn, STAGGER_STEP } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { skillGroups } from "@/lib/skills";

export function SkillsCluster() {
  return (
    <Section
      size="md"
      eyebrow="Toolbox"
      heading="What I work with"
      description="Pragmatic stack — pick the right tool, ship, measure, iterate."
    >
      <dl className="grid gap-8 sm:grid-cols-2">
        {skillGroups.map((group, groupIndex) => (
          <FadeIn key={group.label} delay={groupIndex * STAGGER_STEP}>
            <dt className="text-foreground mb-3 text-sm font-semibold">{group.label}</dt>
            <dd>
              <ul className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li key={item}>
                    <Badge variant="outline">{item}</Badge>
                  </li>
                ))}
              </ul>
            </dd>
          </FadeIn>
        ))}
      </dl>
    </Section>
  );
}
