import type { APIRoute } from "astro";

import { pngResponse, renderCard, SiteCard } from "../lib/og";

/**
 * The site-wide OG card, generated once at build time.
 *
 * Next served this on demand at `/opengraph-image?<hash>`; here it is a static
 * file at `/opengraph-image.png`. The extension is deliberate — a prerendered
 * Astro endpoint writes a file, and without one the host has no reliable way to
 * infer `image/png`. Crawlers only ever reach this URL by reading `og:image`
 * from the page, so the path change is invisible to them.
 */
export const prerender = true;

export const GET: APIRoute = async () => pngResponse(await renderCard(SiteCard()));
