import type { MetadataRoute } from "next";
import { UNDATED_YEAR, YEARS, catalog, indexablePublications, isUndated } from "@/lib/catalog";
import { absoluteUrl, issuePath, magazinePath, yearPath } from "@/lib/seo";

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
  const termsPage: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl("/terms"),
    changeFrequency: "yearly",
    priority: 0.3,
  };

  const magazines = indexablePublications().map((pub) => ({
    url: absoluteUrl(magazinePath(pub.id)),
    changeFrequency: "weekly" as const,
    priority: pub.pages > 10000 ? 0.9 : 0.75,
  }));

  const yearPages = [
    ...YEARS,
    ...(catalog.some((issue) => isUndated(issue.year)) ? [UNDATED_YEAR] : []),
  ].map((year) => ({
    url: absoluteUrl(yearPath(year)),
    changeFrequency: "weekly" as const,
    priority: 0.55,
  }));

  const issues = catalog.map((issue) => ({
    url: absoluteUrl(issuePath(issue.slug)),
    changeFrequency: "monthly" as const,
    priority: issue.readable ? 0.6 : 0.4,
  }));

  return [home, catalogPage, termsPage, ...magazines, ...yearPages, ...issues];
}
