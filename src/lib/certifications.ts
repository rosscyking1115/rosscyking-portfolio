/**
 * Certifications and virtual training shown on the /about page, as two
 * separate sections. Add an entry per credential — each list renders newest
 * first (by `date`).
 */
export interface Certification {
  title: string;
  issuer: string;
  /** Issue date, YYYY-MM. */
  date: string;
  /** Optional expiry, YYYY-MM. */
  expires?: string;
  /** Public verification URL. */
  url?: string;
  /** Optional topic tags. */
  skills?: readonly string[];
}

export const certifications: readonly Certification[] = [
  {
    title: "Google Analytics Certification",
    issuer: "Google · Skillshop",
    date: "2026-06",
    expires: "2027-06",
    url: "https://skillshop.credential.net/4be0d6f8-3473-4609-ac09-30c865307b0e",
    skills: ["GA4", "Web analytics", "Attribution", "Conversion tracking"],
  },
] as const;

/** Forage job simulations (virtual work experience). */
export const virtualTraining: readonly Certification[] = [
  {
    title: "Quantitative Research Job Simulation",
    issuer: "JPMorgan Chase · Forage",
    date: "2026-07",
    skills: ["Price analysis", "Contract pricing", "Credit risk", "FICO scoring"],
  },
  {
    title: "Data Science Job Simulation",
    issuer: "British Airways · Forage",
    date: "2026-06",
    skills: ["Predictive modelling", "Customer analytics", "Classification"],
  },
] as const;
