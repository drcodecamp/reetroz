import rawIssues from "@/data/catalog.json";
import rawPublications from "@/data/publications.json";
import { assetUrl } from "@/lib/assets";
import {
  compareIssueNumber,
  ERAS,
  isUndated,
  UNDATED_YEAR,
  type CatalogIssue,
  type CatalogPublication,
  type Era,
  type EraKey,
} from "@/lib/catalogMeta";

export type {
  CatalogIssue,
  CatalogPublication,
  Era,
  EraKey,
} from "@/lib/catalogMeta";
export {
  compareIssueNumber,
  ERAS,
  isUndated,
  issueNumberValue,
  UNDATED_YEAR,
} from "@/lib/catalogMeta";

export const catalog: CatalogIssue[] = (rawIssues as CatalogIssue[]).map(
  (i) => ({ ...i, cover: assetUrl(i.cover) }),
);
export const publications: CatalogPublication[] =
  rawPublications as CatalogPublication[];

const publicationById = new Map(publications.map((p) => [p.id, p]));

export const YEARS = Array.from(
  new Set(catalog.map((i) => i.year).filter((y) => !isUndated(y))),
).sort((a, b) => a - b);
export const MIN_YEAR = YEARS[0];
export const MAX_YEAR = YEARS[YEARS.length - 1];

export function getIssue(slug: string): CatalogIssue | undefined {
  return catalog.find((i) => i.slug === slug || i.id === slug);
}

export function getPublication(id: string): CatalogPublication | undefined {
  return publicationById.get(id);
}

export function eraOf(key: EraKey): Era {
  return ERAS.find((e) => e.key === key) ?? ERAS[ERAS.length - 1];
}

/** Previous / next issue within the same publication (chronological). */
export function neighbors(issue: CatalogIssue) {
  const list = issuesForPublication(issue.publication);
  const index = list.findIndex((i) => i.id === issue.id);
  return {
    prev: index > 0 ? list[index - 1] : undefined,
    next: index < list.length - 1 ? list[index + 1] : undefined,
  };
}

/** Up-next issues for the watch page: later issues of the same title, then the same year. */
export function recommendedIssues(issue: CatalogIssue, limit = 16): CatalogIssue[] {
  const seen = new Set<string>([issue.slug]);
  const out: CatalogIssue[] = [];
  const take = (items: CatalogIssue[]) => {
    for (const item of items) {
      if (out.length >= limit) return;
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      out.push(item);
    }
  };

  const samePub = issuesForPublication(issue.publication);
  const index = samePub.findIndex((i) => i.id === issue.id);
  if (index >= 0) {
    take(samePub.slice(index + 1));
    take([...samePub.slice(0, index)].reverse());
  }
  take(issuesInYear(issue.year));
  return out;
}

export function issuesInYear(year: number) {
  return catalog.filter((i) => i.year === year);
}

export function issuesForPublication(id: string): CatalogIssue[] {
  return catalog
    .filter((i) => i.publication === id)
    .sort((a, b) => {
      const aU = isUndated(a.year);
      const bU = isUndated(b.year);
      if (aU !== bU) return aU ? 1 : -1;
      if (a.year !== b.year) return a.year - b.year;
      return compareIssueNumber(a, b);
    });
}

/** Titles with at least one ingested issue — safe to index. */
export function indexablePublications(): CatalogPublication[] {
  return publications.filter((p) => p.issues > 0);
}

export function siteStats() {
  const issues = catalog.length;
  const readable = catalog.filter((i) => i.readable).length;
  const pages = catalog.reduce((sum, i) => sum + i.pages, 0);
  return {
    issues,
    readable,
    pages,
    titles: publications.length,
    titlesWithIssues: publications.filter((p) => p.issues > 0).length,
    minYear: MIN_YEAR,
    maxYear: MAX_YEAR,
  };
}

const FEATURED_IDS = [
  "nintendo-power",
  "electronic-gaming-monthly",
  "game-informer",
  "gamepro",
  "pc-gamer-us",
  "cgw",
  "official-us-playstation-magazine",
  "edge",
];

export function featuredPublications(limit = 8): CatalogPublication[] {
  const out: CatalogPublication[] = [];
  for (const id of FEATURED_IDS) {
    const pub = publicationById.get(id);
    if (pub && pub.issues > 0) out.push(pub);
    if (out.length >= limit) return out;
  }
  const rest = publications
    .filter((p) => p.issues > 0 && !out.some((x) => x.id === p.id))
    .sort((a, b) => b.pages - a.pages);
  for (const pub of rest) {
    out.push(pub);
    if (out.length >= limit) break;
  }
  return out;
}

export function relatedPublications(pub: CatalogPublication, limit = 4): CatalogPublication[] {
  return publications
    .filter((p) => p.id !== pub.id && p.issues > 0)
    .map((p) => {
      let score = 0;
      if (p.country === pub.country) score += 2;
      if (p.type === pub.type) score += 1;
      if (p.platforms.some((platform) => pub.platforms.includes(platform))) score += 3;
      score += Math.min(p.issues, 80) / 80;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || b.p.pages - a.p.pages)
    .slice(0, limit)
    .map((x) => x.p);
}

export function publicationCover(pub: CatalogPublication): string | undefined {
  if (pub.coverIssue) {
    const issue = getIssue(pub.coverIssue);
    if (issue) return issue.cover;
  }
  return issuesForPublication(pub.id)[0]?.cover;
}

/**
 * Bump when page objects are replaced at the same R2 key. Read/thumb files are
 * uploaded with Cache-Control: immutable, so the same URL will keep serving a
 * broken extract forever after a re-encode.
 */
export const PAGE_ASSET_REV = "2";

/**
 * Page images: the scan's own JPEG at native resolution (or WebP for issues
 * published with --webp-read; the manifest says which), plus a small WebP thumb.
 */
export function pageUrl(
  slug: string,
  page: number,
  size: "thumb" | "read",
  readFormat: "jpg" | "webp" = "jpg",
) {
  const ext = size === "read" ? readFormat : "webp";
  const url = assetUrl(
    `/pages/${slug}/${size}/${String(page).padStart(3, "0")}.${ext}`,
  );
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${PAGE_ASSET_REV}`;
}
