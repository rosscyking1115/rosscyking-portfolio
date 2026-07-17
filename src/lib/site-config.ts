/**
 * Single source of truth for static site metadata.
 * Update values here rather than hard-coding them in components.
 */
export const siteConfig = {
  name: "Cheng-Yuan King",
  shortName: "Ross King",
  role: "MSc Artificial Intelligence · Data & ML Engineering",
  // Long-form hero/bio copy. Shown on the page; NOT used as the SEO meta tags.
  description:
    "MSc Artificial Intelligence candidate at the University of Sheffield. I build data and ML systems whose decisions you can audit: tested pipelines, honest evaluation, and numbers you can trace back to the test that produced them. Spark-scale backfills, dbt warehouses, ML forecasts, and release-gates for AI agents.",
  // SEO surface: kept short so titles/descriptions don't truncate in search.
  // Title renders as "<shortName> — <titleTagline>" (~50 chars).
  titleTagline: "Data & ML Engineering · AI Evaluation",
  metaDescription:
    "MSc Artificial Intelligence candidate building data and ML systems you can audit: Spark-scale pipelines, dbt warehouses, ML forecasts, and release-gates for AI agents.",
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
