import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * Security headers are intentionally minimal here — they get hardened in
 * Phase 5 (CSP nonce, HSTS, frame-ancestors, etc.). Keep this file readable.
 */
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
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
