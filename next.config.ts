import type { NextConfig } from "next";

/**
 * Security headers reference:
 *   - https://infosec.mozilla.org/guidelines/web_security
 *   - https://owasp.org/www-project-secure-headers/
 *
 * The CSP is intentionally moderately strict — no nonces (so we tolerate
 * inline styles for Motion + inline runtime scripts Next.js emits) but it
 * blocks every external origin we don't explicitly allow. That's enough to
 * earn an A on Mozilla Observatory and is appropriate for a personal site.
 *
 * Routes that need different headers (e.g. /.well-known/security.txt as
 * text/plain) get their own entry below.
 */

const isProd = process.env.NODE_ENV === "production";

// Origins we explicitly allow. Add new ones here, not inline below.
const TURNSTILE = "https://challenges.cloudflare.com";

const baseCspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' covers the small inline scripts Next.js emits; switch
  // to nonces in middleware if we ever want a perfect Observatory score.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${isProd ? "" : "ws: wss: "}${TURNSTILE}`,
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
  // Two years, include subdomains, ready for HSTS preload list.
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
        // security.txt should be served as plain text per RFC 9116.
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
