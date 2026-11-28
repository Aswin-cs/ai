import type { NextConfig } from "next";

/**
 * Builds the enforcing Content-Security-Policy header value.
 * Tradeoff: Next.js 16 `cacheComponents` and `partialPrefetching` pre-render static
 * shells at build time, which is incompatible with per-request dynamic nonces in
 * script-src (per Next.js CSP guide). We therefore keep `'unsafe-inline'` for scripts/styles
 * and restrict `'unsafe-eval'` strictly to local development (`NODE_ENV === "development"`).
 */
export function buildContentSecurityPolicy(isDev = process.env.NODE_ENV === "development"): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self' https://nominatim.openstreetmap.org https://air-quality-api.open-meteo.com",
  ].join("; ");
}

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  serverExternalPackages: ["mongoose"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
        ],
      },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
