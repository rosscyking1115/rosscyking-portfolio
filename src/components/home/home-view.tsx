import { FeaturedProjects } from "@/components/home/featured-projects";
import { Hero } from "@/components/home/hero";
import { LensSwitcher } from "@/components/home/lens-switcher";
import { SkillsCluster } from "@/components/home/skills-cluster";
import { Container } from "@/components/layout/container";
import { DEFAULT_LENS, type LensKey, lensNav } from "@/lib/lenses";

/**
 * The home page for a given role lens. `/` renders the default (`all`) lens;
 * `/for/<lens>` renders the same layout re-ranked for that role. Both share
 * this component so the two routes can never drift apart.
 */
export function HomeView({ lens = DEFAULT_LENS }: { lens?: LensKey }) {
  return (
    <>
      <Hero />
      <Container className="-mt-4 pb-2">
        <LensSwitcher items={lensNav} current={lens} />
      </Container>
      <FeaturedProjects lens={lens} />
      <SkillsCluster />
    </>
  );
}
