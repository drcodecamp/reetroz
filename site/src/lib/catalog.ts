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

export const YEARS = Array.from(new Set(catalog.map((i) => i.year))).sort(
  (a, b) => a - b,
);
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
  const list = catalog.filter((i) => i.publication === issue.publication);
  const index = list.findIndex((i) => i.id === issue.id);
  return {
    prev: index > 0 ? list[index - 1] : undefined,
    next: index < list.length - 1 ? list[index + 1] : undefined,
  };
}

export function issuesInYear(year: number) {
  return catalog.filter((i) => i.year === year);
}

/** Page images: the scan's own JPEG at native resolution, plus a small WebP thumb. */
export function pageUrl(slug: string, page: number, size: "thumb" | "read") {
  const ext = size === "read" ? "jpg" : "webp";
  return assetUrl(`/pages/${slug}/${size}/${String(page).padStart(3, "0")}.${ext}`);
}
