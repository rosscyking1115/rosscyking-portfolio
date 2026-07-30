import type { APIRoute } from "astro";

import { siteConfig } from "../lib/site-config";

/**
 * Ported from src/app/robots.ts. The `/_next/` note no longer applies — Astro
 * serves its assets from `/_astro/` and they are equally crawlable — but the
 * rule set is otherwise identical: allow everything, block only future API
 * endpoints.
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    `User-Agent: *
Allow: /
Disallow: /api/
Host: ${siteConfig.url}
Sitemap: ${siteConfig.url}/sitemap.xml
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
