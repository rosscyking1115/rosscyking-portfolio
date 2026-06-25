/**
 * Single source of truth for static site metadata.
 * Update values here rather than hard-coding them in components.
 */
export const siteConfig = {
  name: "Cheng-Yuan (Ross) King",
  shortName: "Ross King",
  role: "MSc Artificial Intelligence · AI Safety, GenAI Evaluation & Applied Data Science",
  description:
    "MSc Artificial Intelligence candidate at the University of Sheffield. I build practical, reproducible AI evaluation systems and data products, with recent work on AI-agent reliability, RAG grounding, red-team testing, safety classifiers, model evaluation, and production-style Python workflows.",
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
