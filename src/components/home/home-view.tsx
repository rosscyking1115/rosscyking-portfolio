import { FeaturedProjects } from "@/components/home/featured-projects";
import { Hero } from "@/components/home/hero";
import { SkillsCluster } from "@/components/home/skills-cluster";
import { DEFAULT_LENS, type LensKey, lensNav } from "@/lib/lenses";
import { getLensFeaturedCards, getProjectMeta } from "@/lib/projects";

/**
 * The home page. The hero and skills are lens-independent; only the featured
 * showcase re-ranks by role, and it does so in place on the client — every
 * lens's cards are built here and handed down, so switching never navigates.
 */
export async function HomeView({ lens = DEFAULT_LENS }: { lens?: LensKey }) {
  const [lensData, all] = await Promise.all([getLensFeaturedCards(), getProjectMeta()]);

  return (
    <>
      <Hero />
      <FeaturedProjects
        lensData={lensData}
        nav={lensNav}
        allCount={all.length}
        initialLens={lens}
      />
      <SkillsCluster />
    </>
  );
}
