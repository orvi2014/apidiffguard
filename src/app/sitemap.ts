import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://apidiffguard.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/pricing",
    "/docs",
    "/docs/cli",
    "/docs/api",
    "/changelog",
    "/tools",
    "/tools/json-diff",
    "/tools/json-formatter",
    "/tools/json-validator",
    "/blog",
    "/login",
    "/register",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: path.startsWith("/tools") || path === "/blog"
        ? ("weekly" as const)
        : ("monthly" as const),
      priority: path === "" ? 1 : path.startsWith("/tools") ? 0.9 : 0.7,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
