import type { MetadataRoute } from "next";
import { catalog, indexablePublications } from "@/lib/catalog";
import { absoluteUrl, issuePath, magazinePath } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const home: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl("/"),
    changeFrequency: "weekly",
    priority: 1,
  };
  const catalogPage: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl("/catalog"),
    changeFrequency: "weekly",
    priority: 0.8,
  };

  const magazines = indexablePublications().map((pub) => ({
    url: absoluteUrl(magazinePath(pub.id)),
    changeFrequency: "weekly" as const,
    priority: pub.pages > 10000 ? 0.9 : 0.75,
  }));

  const issues = catalog.map((issue) => ({
    url: absoluteUrl(issuePath(issue.slug)),
    changeFrequency: "monthly" as const,
    priority: issue.readable ? 0.6 : 0.4,
    images: issue.cover ? [absoluteUrl(issue.cover)] : undefined,
  }));

  return [home, catalogPage, ...magazines, ...issues];
}
