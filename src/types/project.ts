export interface ProjectMeta {
  slug: string;
  title: string;
  summary: string;
  stack: readonly string[];
  role?: string;
  period: string;
  publishedAt: string; // ISO date — used for sorting, not display
  featured?: boolean;
  /** Manual ordering for the homepage featured grid (ascending). Falls back to publishedAt. */
  featuredOrder?: number;
  /** Work-in-progress: visible in dev, excluded from production builds. */
  draft?: boolean;
  /** Live-demo screenshot under /public, shown in the featured showcase. */
  screenshot?: string;
  /** Terminal-readout lines for showcase cards with no UI to screenshot. */
  terminal?: string[];
  /** Headline numbers rendered as an inline metric strip on the detail page. */
  metrics?: { value: string; label: string }[];
  links?: {
    github?: string;
    demo?: string;
    paper?: string;
    report?: string;
    pypi?: string;
  };
}

export interface LoadedProject extends ProjectMeta {
  /** Raw MDX source body (without front matter). */
  content: string;
  /** Rough estimate, e.g. "4 min read". */
  readingTime: string;
}

/**
 * Featured-showcase card data: everything a card renders (incl. reading time)
 * but not the MDX body — safe to serialize from a server component to the
 * client lens switcher.
 */
export interface FeaturedCard extends ProjectMeta {
  readingTime: string;
}

/** Back-compat alias kept for existing imports. */
export type Project = ProjectMeta;
