import type { MetadataRoute } from "next";
import { blog, source } from "@/lib/source";
import { SITE_URL } from "@/lib/seo";

/** Build-time sitemap — avoid request-time fumadocs/auth failures. */
export const dynamic = "force-static";
export const revalidate = 3600;

function uniqueByUrl(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = SITE_URL.replace(/\/$/, "");

  const staticRoutes: {
    path: string;
    priority: number;
    changeFrequency: NonNullable<
      MetadataRoute.Sitemap[number]["changeFrequency"]
    >;
  }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/about", priority: 0.95, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
    { path: "/tools", priority: 0.95, changeFrequency: "weekly" },
    { path: "/tools/json-diff", priority: 0.95, changeFrequency: "weekly" },
    { path: "/tools/json-formatter", priority: 0.9, changeFrequency: "weekly" },
    { path: "/tools/json-validator", priority: 0.9, changeFrequency: "weekly" },
    { path: "/blog", priority: 0.85, changeFrequency: "weekly" },
    { path: "/changelog", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  let docPages: MetadataRoute.Sitemap = [];
  let blogPages: MetadataRoute.Sitemap = [];

  try {
    docPages = source.getPages().map((page) => ({
      url: `${base}${page.url}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: page.url === "/docs" ? 0.85 : 0.7,
    }));
  } catch {
    docPages = [
      { url: `${base}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    ];
  }

  try {
    blogPages = blog.getPages().map((page) => {
      const raw = page.data.date;
      const lastModified =
        raw && !Number.isNaN(Date.parse(String(raw)))
          ? new Date(String(raw))
          : now;
      return {
        url: `${base}${page.url}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      };
    });
  } catch {
    blogPages = [];
  }

  return uniqueByUrl([
    ...staticRoutes.map((route) => ({
      url: `${base}${route.path === "/" ? "" : route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...docPages,
    ...blogPages,
  ]);
}
