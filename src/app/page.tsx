import { FeaturedProjects } from "@/components/home/featured-projects";
import { Hero } from "@/components/home/hero";
import { SkillsCluster } from "@/components/home/skills-cluster";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedProjects />
      <SkillsCluster />
    </>
  );
}
