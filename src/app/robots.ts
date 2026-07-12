import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://apidiffguard.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/endpoints", "/diff", "/alerts", "/schedules", "/settings"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
