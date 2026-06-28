/**
 * Single source of truth for static site metadata.
 * Update values here rather than hard-coding them in components.
 */
export const siteConfig = {
  name: "Cheng-Yuan (Ross) King",
  shortName: "Ross King",
  role: "MSc Artificial Intelligence · Applied AI, Data Science & Evaluation",
  // Long-form hero/bio copy. Shown on the page; NOT used as the SEO meta tags.
  description:
    "MSc Artificial Intelligence candidate at the University of Sheffield. I build applied AI and data-science systems across GenAI evaluation, fintech analytics, marketing effectiveness, and production-style Python — from AI-agent reliability and RAG/LLM benchmarks to dashboards and decision-support tools.",
  // SEO surface: kept short so titles/descriptions don't truncate in search.
  // Title renders as "<shortName> — <titleTagline>" (~50 chars).
  titleTagline: "Applied AI, Data Science & Evaluation",
  metaDescription:
    "MSc Artificial Intelligence candidate building applied AI and data products across GenAI evaluation, fintech analytics, marketing effectiveness, and Python.",
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
