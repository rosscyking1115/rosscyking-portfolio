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
    name: `${siteConfig.shortName} — ${siteConfig.role}`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
  };
}
