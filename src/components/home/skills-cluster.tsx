import { Container } from "@/components/layout/container";
import { IndexMark } from "@/components/layout/index-mark";
import { FadeIn, STAGGER_STEP } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { skillGroups } from "@/lib/skills";

export function SkillsCluster() {
  return (
    <section className="border-border bg-muted/30 border-t">
      <Container className="py-20">
        <IndexMark mark="02" label="Toolbox" />
        <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance">
          How I work, grouped
        </h2>

        <dl className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((group, groupIndex) => (
            <FadeIn key={group.label} delay={groupIndex * STAGGER_STEP}>
              <dt className="text-primary font-mono text-xs tracking-wider uppercase">
                {group.label}
              </dt>
              <dd className="mt-3">
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
      </Container>
    </section>
  );
}
