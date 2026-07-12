import type { MetadataRoute } from "next";
import { blog, source } from "@/lib/source";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://apidiffguard.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/pricing",
    "/changelog",
    "/tools",
    "/tools/json-diff",
    "/tools/json-formatter",
    "/tools/json-validator",
    "/blog",
    "/login",
    "/register",
  ];

  const docPages = source.getPages().map((page) => ({
    url: `${base}${page.url}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogPages = blog.getPages().map((page) => ({
    url: `${base}${page.url}`,
    lastModified: new Date(String(page.data.date ?? Date.now())),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    ...staticRoutes.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: path.startsWith("/tools") || path === "/blog"
        ? ("weekly" as const)
        : ("monthly" as const),
      priority: path === "" ? 1 : path.startsWith("/tools") ? 0.9 : 0.7,
    })),
    ...docPages,
    ...blogPages,
  ];
}
