/**
 * Single source of truth for static site metadata.
 * Ported verbatim from the Next app's src/lib/site-config.ts — same values,
 * same shape. Update values here rather than hard-coding them in components.
 */
export const siteConfig = {
  name: "Cheng-Yuan King",
  shortName: "Ross King",
  role: "MSc Artificial Intelligence · AI evaluation and reliability",
  // Long-form hero/bio copy. Shown on the page; NOT used as the SEO meta tags.
  // Ross's wording (2026-07-30). Reordered, not cut: the Spark, dbt and
  // forecasting work is real and now supports the lead instead of being it.
  description:
    "MSc Artificial Intelligence candidate at the University of Sheffield. I build software for evaluating AI honestly: release gates for agents, benchmarks that can fail, and numbers you can trace back to the test that produced them. The same discipline runs through the data work — Spark-scale backfills, dbt warehouses and ML forecasts.",
  // SEO surface: kept short so titles/descriptions don't truncate in search.
  // Title renders as "<shortName> — <titleTagline>" (~40 chars).
  //
  // Ross's call (2026-07-29). His positioning closed as software engineering
  // specialising in AI evaluation and reliability, and LinkedIn and the GitHub
  // profile were rebuilt to match; the site had never been updated. The
  // previous value, "Data & ML Engineering · AI Evaluation", led with the thing
  // he had moved away from the front.
  //
  // This string has FIVE consumers, which is why it lives here alone: the home
  // <title>, og:title, twitter:title, JSON-LD via `role`, and the OG card alt
  // text (og-config.ts interpolates it into DEFAULT_OG_ALT on every route).
  titleTagline: "AI evaluation and reliability",
  // Ross's wording (2026-07-29), to match the new titleTagline.
  metaDescription:
    "MSc Artificial Intelligence candidate working on AI evaluation and reliability: release gates for agents, honest benchmarks, and data pipelines you can audit.",
  url: "https://rosscyking.com",
  ogImage: "/og.png",
  email: "rosscyking@gmail.com",
  location: "Sheffield, United Kingdom",
  availability: "Available for full-time roles from Oct 2026",

  /**
   * The right-hand half of /contact's availability band (design pass, 16a):
   * "the visa fact right-aligned as a 12px mono label".
   *
   * SELECTED FROM content/about.mdx, NOT WRITTEN. Ross's sentence there is "I'm
   * available from October 2026 and have a UK Graduate Visa route, so I don't
   * need sponsorship for two years after graduating." This is the same two
   * facts at label length — the route and the consequence — and the consequence
   * is the half a hiring reader is actually screening on.
   *
   * It lives here rather than being read from the MDX because a band label is
   * not prose: pulling a clause out of a paragraph at build time would mean the
   * label changes shape whenever the paragraph is edited. FLAGGED for Ross —
   * this is his fact in his words, shortened, and shortening published copy is
   * his call.
   */
  visa: "UK Graduate Visa · no sponsorship for two years",
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
