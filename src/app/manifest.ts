import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

/**
 * Web App Manifest. Icons are intentionally omitted here — Next.js's
 * `app/icon.tsx` and `app/apple-icon.tsx` are auto-detected by browsers
 * via the <link rel="icon"> and <link rel="apple-touch-icon"> tags that
 * Next emits in <head>. Listing them again here would risk path mismatch
 * since Next serves them at hash-suffixed URLs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.shortName} — ${siteConfig.titleTagline}`,
    short_name: siteConfig.shortName,
    description: siteConfig.metaDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#fafafb",
    theme_color: "#151619",
  };
}
