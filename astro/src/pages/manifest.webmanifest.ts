import type { APIRoute } from "astro";

import { siteConfig } from "../lib/site-config";

/**
 * Web App Manifest, ported from src/app/manifest.ts.
 *
 * The Next version omitted `icons` deliberately: it served them at
 * hash-suffixed URLs, so listing them risked a path mismatch. Astro serves them
 * at stable paths, so they are listed properly here — a small improvement, and
 * the reason the original comment no longer applies.
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: `${siteConfig.shortName} — ${siteConfig.titleTagline}`,
        short_name: siteConfig.shortName,
        description: siteConfig.metaDescription,
        start_url: "/",
        display: "standalone",
        background_color: "#fafafb",
        theme_color: "#151619",
        icons: [
          { src: "/icon.png", sizes: "512x512", type: "image/png" },
          { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
        ],
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/manifest+json; charset=utf-8" } },
  );
