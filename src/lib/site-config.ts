/**
 * Single source of truth for static site metadata.
 * Update values here rather than hard-coding them in components.
 */
export const siteConfig = {
  name: "Cheng-Yuan (Ross) King",
  shortName: "Ross King",
  role: "MSc Artificial Intelligence · AI Safety, GenAI Evaluation & Applied Data Science",
  // Long-form hero/bio copy. Shown on the page; NOT used as the SEO meta tags.
  description:
    "MSc Artificial Intelligence candidate at the University of Sheffield. I build practical, reproducible AI evaluation systems and data products, with recent work on AI-agent reliability, RAG grounding, red-team testing, safety classifiers, model evaluation, and production-style Python workflows.",
  // SEO surface: kept short so titles/descriptions don't truncate in search.
  // Title renders as "<shortName> — <titleTagline>" (~54 chars).
  titleTagline: "AI Safety, GenAI Evaluation & Data Science",
  metaDescription:
    "MSc Artificial Intelligence candidate building AI-agent safety evaluation, RAG/LLM benchmarks, red-team testing, and production-style Python data products.",
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
