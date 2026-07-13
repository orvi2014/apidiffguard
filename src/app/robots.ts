import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Private app surfaces — keep out of search and AI training corpora. */
const PRIVATE = [
  "/login",
  "/register",
  "/forgot-password",
  "/update-password",
  "/dashboard",
  "/endpoints",
  "/diff",
  "/diffs",
  "/alerts",
  "/schedules",
  "/settings",
  "/api/",
  "/auth/",
];

/** Major AI retrieval / answer crawlers (explicit Allow for AEO visibility). */
const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "GoogleOther",
  "Applebot-Extended",
  "Bingbot",
  "Amazonbot",
  "meta-externalagent",
  "FacebookBot",
  "Bytespider",
  "CCBot",
  "Diffbot",
  "YouBot",
  "cohere-ai",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE,
      },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
