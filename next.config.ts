import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// The diff viewer renders user-supplied JSON, so lock down what can execute.
// 'unsafe-inline' on style-src is required by Tailwind/Radix inline styles;
// 'unsafe-inline'/'unsafe-eval' on script-src are required by the Next.js dev
// overlay and are dropped in production builds. localhost is allowed in dev for
// the same reason plus the Impeccable live-mode overlay, which serves its
// script from a local helper port; both are inside the isDev guard and never
// reach a production response.
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${
    isDev ? " 'unsafe-eval' http://localhost:*" : ""
  }`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Supabase (REST + realtime) and Stripe.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com${isDev ? " ws: http://localhost:*" : ""}`,
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Keep recently visited console RSC payloads warm for snappier back/forward nav.
    // Low on `dynamic`: this is a monitoring console, so stale health after a
    // back/forward nav is actively misleading.
    staleTimes: {
      dynamic: 5,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      {
        // Authenticated JSON must never be held by a shared cache.
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
