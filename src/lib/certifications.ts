/**
 * Certifications & virtual training shown on the /about page.
 * Add an entry per credential — rendered newest first (by `date`).
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
