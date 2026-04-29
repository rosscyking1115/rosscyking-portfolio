export interface ProjectMeta {
  slug: string;
  title: string;
  summary: string;
  stack: readonly string[];
  role?: string;
  period: string;
  publishedAt: string; // ISO date — used for sorting, not display
  featured?: boolean;
  links?: {
    github?: string;
    demo?: string;
    paper?: string;
  };
}

export interface LoadedProject extends ProjectMeta {
  /** Raw MDX source body (without front matter). */
  content: string;
  /** Rough estimate, e.g. "4 min read". */
  readingTime: string;
}

/** Back-compat alias kept for existing imports. */
export type Project = ProjectMeta;
