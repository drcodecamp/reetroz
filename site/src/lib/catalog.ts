import rawIssues from "@/data/catalog.json";
import rawPublications from "@/data/publications.json";
import { assetUrl } from "@/lib/assets";

export type EraKey = "early" | "boom" | "cdrom" | "2000s" | "modern";

export type CatalogIssue = {
  id: string;
  slug: string;
  publication: string;
  number: string;
  year: number;
  date: string;
  pages: number;
  cover: string;
  era: EraKey;
  readable: boolean;
  hasText: boolean;
  special?: string | null;
};

export type CatalogPublication = {
  id: string;
  title: string;
  short: string;
  country: string;
  type: string;
  platforms: string[];
  status: "ceased" | "active" | "unknown";
  firstYear: number | null;
  lastYear: number | null;
  publisher: string | null;
  description?: string | null;
  metadataStatus: "stub" | "verified";
  rights: string;
  provider: string;
  knownSources: { provider: string; url: string; items?: number | null }[];
  issues: number;
  pages: number;
  readable: number;
  coverIssue?: string | null;
};

export type Era = {
  key: EraKey;
  label: string;
  short: string;
  from: number;
  to: number;
  blurb: string;
};

export const ERAS: Era[] = [
  {
    key: "early",
    label: "The first wave",
    short: "1981–85",
    from: 1981,
    to: 1985,
    blurb:
      "Newsletters and forty-page hobbyist issues cover the Atari 2600, Apple II and the first home computers, then survive the 1983 crash.",
  },
  {
    key: "boom",
    label: "8-bit and 16-bit boom",
    short: "1986–92",
    from: 1986,
    to: 1992,
    blurb:
      "The NES, Mega Drive, Amiga and ST era. Magazines go glossy, grow cover tapes and shout in neon.",
  },
  {
    key: "cdrom",
    label: "CD-ROM and the 3D revolution",
    short: "1993–99",
    from: 1993,
    to: 1999,
    blurb:
      "Doom, PlayStation, N64, Half-Life. Issues swell past 300 pages during the golden age of games print.",
  },
  {
    key: "2000s",
    label: "The 2000s",
    short: "2000–09",
    from: 2000,
    to: 2009,
    blurb:
      "Broadband, MMOs and the console wars. Print slims down as the web takes over news and reviews.",
  },
  {
    key: "modern",
    label: "The last magazines",
    short: "2010–",
    from: 2010,
    to: 2099,
    blurb: "The survivors: Edge, PC Gamer, Retro Gamer and a handful of official titles.",
  },
];

export const catalog: CatalogIssue[] = (rawIssues as CatalogIssue[]).map(
  (i) => ({ ...i, cover: assetUrl(i.cover) }),
);
export const publications: CatalogPublication[] =
  rawPublications as CatalogPublication[];

const publicationById = new Map(publications.map((p) => [p.id, p]));

/** Sentinel in issues.json when VGHF had no date. Not a real year. */
export const UNDATED_YEAR = 9999;

export const YEARS = Array.from(
  new Set(catalog.map((i) => i.year).filter((y) => y !== UNDATED_YEAR)),
).sort((a, b) => a - b);
export const MIN_YEAR = YEARS[0];
export const MAX_YEAR = YEARS[YEARS.length - 1];

export function isUndated(year: number) {
  return year === UNDATED_YEAR;
}

/** Leading number from "#368" / "1.1" / "84". Null for "special" and the like. */
export function issueNumberValue(number: string): number | null {
  const match = number.trim().match(/^(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function compareIssueNumber(a: CatalogIssue, b: CatalogIssue): number {
  const na = issueNumberValue(a.number);
  const nb = issueNumberValue(b.number);
  if (na != null && nb != null && na !== nb) return na - nb;
  if (na != null && nb == null) return -1;
  if (na == null && nb != null) return 1;
  return a.number.localeCompare(b.number) || a.publication.localeCompare(b.publication);
}

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

export function startReadingIssue(): CatalogIssue | undefined {
  return (
    getIssue("nintendo-power-1") ??
    issuesForPublication("nintendo-power").find((i) => i.readable) ??
    catalog.find((i) => i.readable)
  );
}

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
  return assetUrl(`/pages/${slug}/${size}/${String(page).padStart(3, "0")}.${ext}`);
}
