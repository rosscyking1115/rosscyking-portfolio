/**
 * Single source of truth for static site metadata.
 * Update values here rather than hard-coding them in components.
 */
export const siteConfig = {
  name: "Cheng-Yuan King",
  shortName: "Ross King",
  role: "MSc Artificial Intelligence · AI evaluation and reliability",
  // Long-form hero/bio copy. Shown on the page; NOT used as the SEO meta tags.
  // Ross's wording (2026-07-30). Kept byte-identical to the Astro copy — see
  // the titleTagline note below.
  description:
    "MSc Artificial Intelligence candidate at the University of Sheffield. I build software for evaluating AI honestly: release gates for agents, benchmarks that can fail, and numbers you can trace back to the test that produced them. The same discipline runs through the data work — Spark-scale backfills, dbt warehouses and ML forecasts.",
  // SEO surface: kept short so titles/descriptions don't truncate in search.
  // Title renders as "<shortName> — <titleTagline>" (~40 chars).
  //
  // Ross's call (2026-07-29) — see the note in astro/src/lib/site-config.ts.
  // Kept byte-identical to the Astro copy: the two files are duplicates until
  // cutover, and editing one without the other silently diverges the live site
  // from the one replacing it.
  titleTagline: "AI evaluation and reliability",
  // Ross's wording (2026-07-29), to match the new titleTagline. Kept
  // byte-identical to the Astro copy — see the titleTagline note above.
  metaDescription:
    "MSc Artificial Intelligence candidate working on AI evaluation and reliability: release gates for agents, honest benchmarks, and data pipelines you can audit.",
  url: "https://rosscyking.com",
  ogImage: "/og.png",
  email: "rosscyking@gmail.com",
  location: "Sheffield, United Kingdom",
  availability: "Available for full-time roles from Oct 2026",
  links: {
    github: "https://github.com/rosscyking1115",
    linkedin: "https://www.linkedin.com/in/rosscyking",
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/projects", label: "Projects" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
