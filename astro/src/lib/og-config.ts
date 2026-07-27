/**
 * Open Graph constants, deliberately kept in their own dependency-free module.
 *
 * These are needed by both the card generator (src/lib/og.tsx) and every page
 * layout that emits `og:image` meta tags. Importing them from og.tsx instead
 * pulls satori and @resvg/resvg-js into the page graph — and resvg ships a
 * native .node binary that Vite's dependency optimizer cannot load, which takes
 * down the dev server for every page, not just the OG endpoints.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The site-wide card. Project pages override with their own path. */
export const DEFAULT_OG_IMAGE = "/opengraph-image.png";
