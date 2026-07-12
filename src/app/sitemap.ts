import type { MetadataRoute } from "next";
import { blog, source } from "@/lib/source";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
    { path: "/tools", priority: 0.95, changeFrequency: "weekly" },
    { path: "/tools/json-diff", priority: 0.95, changeFrequency: "weekly" },
    { path: "/tools/json-formatter", priority: 0.9, changeFrequency: "weekly" },
    { path: "/tools/json-validator", priority: 0.9, changeFrequency: "weekly" },
    { path: "/blog", priority: 0.85, changeFrequency: "weekly" },
    { path: "/docs", priority: 0.85, changeFrequency: "weekly" },
    { path: "/changelog", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  const docPages = source.getPages().map((page) => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogPages = blog.getPages().map((page) => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: new Date(String(page.data.date ?? Date.now())),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...docPages,
    ...blogPages,
  ];
}
