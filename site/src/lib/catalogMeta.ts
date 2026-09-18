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

/** Sentinel in issues.json when VGHF had no date. Not a real year. */
export const UNDATED_YEAR = 9999;

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
