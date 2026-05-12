/**
 * Single source of truth for static site metadata.
 * Update values here rather than hard-coding them in components.
 */
export const siteConfig = {
  name: "Cheng-Yuan (Ross) King",
  shortName: "Ross King",
  role: "Data & ML Engineer · MSc Artificial Intelligence",
  description:
    "MSc Artificial Intelligence student at the University of Sheffield with a Computer Science background. I build practical data and ML systems, from SQL/dbt analytics warehouses to distributed PySpark workflows and LLM evaluation on GPU/HPC infrastructure.",
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
