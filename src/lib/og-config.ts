import { siteConfig } from "./site-config";

/**
 * Open Graph constants, deliberately kept clear of the rendering dependencies.
 *
 * These are needed by both the card generator (src/lib/og.tsx) and every page
 * layout that emits `og:image` meta tags. Importing them from og.tsx instead
 * pulls satori and @resvg/resvg-js into the page graph — and resvg ships a
 * native .node binary that Vite's dependency optimizer cannot load, which takes
 * down the dev server for every page, not just the OG endpoints.
 *
 * site-config is a plain object literal, so importing it here costs nothing and
 * keeps the alt text tied to the same strings the card itself renders.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The site-wide card. Project pages override with their own path. */
export const DEFAULT_OG_IMAGE = "/opengraph-image.png";

/**
 * Alt text for the share cards, ported from the `export const alt` in
 * src/app/opengraph-image.tsx and src/app/projects/[slug]/opengraph-image.tsx.
 *
 * Next emitted these as og:image:alt and twitter:image:alt on every route; the
 * first cut of the Astro layout dropped them, which left the card with no text
 * alternative anywhere it is unfurled. Kept beside the size constants so the
 * two can't drift apart.
 */
export const DEFAULT_OG_ALT = `${siteConfig.name} — ${siteConfig.titleTagline}`;

/** Project cards render the project's own screenshot, so the alt is generic. */
export const PROJECT_OG_ALT = "Project preview";
