import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/recipes", "/recipes/", "/signup", "/login", "/privacy", "/scan", "/kitchen", "/shop"],
        disallow: ["/api/", "/settings", "/cook/", "/recipes/plan", "/tonight"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
