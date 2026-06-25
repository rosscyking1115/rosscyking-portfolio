import { siteConfig } from "@/lib/site-config";

/**
 * Person structured data (schema.org). Surfaced in Google's Knowledge Graph,
 * LinkedIn link previews, and other rich-result consumers. Inserted as a
 * `<script type="application/ld+json">` block in the root layout.
 */
export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    url: siteConfig.url,
    email: `mailto:${siteConfig.email}`,
    jobTitle: siteConfig.role,
    description: siteConfig.description,
    sameAs: [siteConfig.links.github, siteConfig.links.linkedin],
    knowsAbout: [
      "AI Safety",
      "GenAI Evaluation",
      "LLM Evaluation",
      "RAG Evaluation",
      "Red-team testing",
      "Machine Learning",
      "Natural Language Processing",
      "Data Science",
      "Python",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sheffield",
      addressCountry: "GB",
    },
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "University of Sheffield" },
      { "@type": "CollegeOrUniversity", name: "Queen's University Belfast" },
    ],
  } as const;
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.shortName,
    url: siteConfig.url,
    inLanguage: "en-GB",
  } as const;
}
