import type { NextConfig } from "next";

/**
 * Security headers reference:
 *   - https://infosec.mozilla.org/guidelines/web_security
 *   - https://owasp.org/www-project-secure-headers/
 */

const isProd = process.env.NODE_ENV === "production";

// Origins we explicitly allow. Add new ones here, not inline below.
const TURNSTILE = "https://challenges.cloudflare.com";
const VERCEL_ANALYTICS = "https://va.vercel-scripts.com";
const VERCEL_INSIGHTS = "https://vitals.vercel-insights.com";

const baseCspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' covers Next.js's small inline runtime scripts.
  // Vercel Analytics injects from va.vercel-scripts.com (script-src).
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} ${TURNSTILE} ${VERCEL_ANALYTICS}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Vercel Analytics + Speed Insights post telemetry to vitals.vercel-insights.com.
  `connect-src 'self' ${isProd ? "" : "ws: wss: "}${TURNSTILE} ${VERCEL_ANALYTICS} ${VERCEL_INSIGHTS}`,
  `frame-src 'self' ${TURNSTILE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
];

if (isProd) baseCspDirectives.push("upgrade-insecure-requests");

const csp = baseCspDirectives.join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/.well-known/security.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
