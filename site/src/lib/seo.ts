import type { Metadata } from "next";
import {
  type CatalogIssue,
  type CatalogPublication,
  siteStats,
} from "@/lib/catalog";

export const SITE_NAME = "Pixel Press";

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3210").replace(
    /\/+$/,
    "",
  );
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteOrigin()}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function magazinePath(id: string) {
  return `/magazines/${id}`;
}

export function issuePath(slug: string) {
  return `/issue/${slug}`;
}

export function yearSpan(pub: CatalogPublication): string | null {
  if (pub.firstYear && pub.lastYear && pub.firstYear !== pub.lastYear) {
    return `${pub.firstYear}–${pub.lastYear}`;
  }
  if (pub.firstYear) return String(pub.firstYear);
  return null;
}

const COUNTRIES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  AU: "Australia",
  CA: "Canada",
  JP: "Japan",
  DE: "Germany",
  FR: "France",
};

const PLATFORMS: Record<string, string> = {
  pc: "PC",
  mac: "Mac",
  nintendo: "Nintendo",
  sega: "Sega",
  playstation: "PlayStation",
  xbox: "Xbox",
  amiga: "Amiga",
  "atari-st": "Atari ST",
  "atari-8bit": "Atari 8-bit",
  "atari-2600": "Atari 2600",
  c64: "Commodore 64",
  "zx-spectrum": "ZX Spectrum",
  "amstrad-cpc": "Amstrad CPC",
  msx: "MSX",
  "apple-ii": "Apple II",
  "3do": "3DO",
  "neo-geo": "Neo Geo",
  arcade: "arcade",
  handheld: "handheld",
  mobile: "mobile",
  multi: "multi-platform",
};

const TYPES: Record<string, string> = {
  official: "official magazine",
  consumer: "consumer magazine",
  trade: "trade magazine",
  newsletter: "newsletter",
  fanzine: "fanzine",
  strategy: "strategy magazine",
  developer: "developer magazine",
  other: "magazine",
};

export function countryName(code: string) {
  return COUNTRIES[code] ?? code;
}

export function platformLabel(id: string) {
  return PLATFORMS[id] ?? id;
}

export function typeLabel(type: string) {
  return TYPES[type] ?? "magazine";
}

function formatCount(n: number) {
  return n.toLocaleString("en-US");
}

export function homeTitle() {
  return `Read Nintendo Power, EGM, GamePro and 100 vintage game magazines online | ${SITE_NAME}`;
}

export function homeDescription() {
  const s = siteStats();
  return `A browser reader for out-of-print game magazines. ${s.titles} titles, ${formatCount(s.issues)} issues, ${formatCount(s.pages)} pages. No PDF, no CBR app. Open Nintendo Power #1 or browse the catalog.`;
}

export function catalogTitle() {
  return "Video game magazine archive";
}

export function catalogDescription() {
  const s = siteStats();
  return `Browse ${s.titles} vintage game magazines and ${formatCount(s.issues)} issues by title, year and era. ${formatCount(s.readable)} issues are readable online — no download.`;
}

export function publicationTitle(pub: CatalogPublication) {
  const years = yearSpan(pub);
  return years
    ? `${pub.title} archive (${years})`
    : `${pub.title} archive`;
}

export function publicationDescription(pub: CatalogPublication) {
  const years = yearSpan(pub);
  const when = years ? `, ${years}` : "";
  const readable =
    pub.readable > 0
      ? `${formatCount(pub.readable)} ${pub.readable === 1 ? "issue is" : "issues are"} readable in the browser`
      : "issue records are listed here";
  return `Read ${pub.title}${when} online. ${formatCount(pub.issues)} issues and ${formatCount(pub.pages)} pages in this archive; ${readable}. No PDF or CBR download.`;
}

export function publicationBlurb(pub: CatalogPublication) {
  const years = yearSpan(pub);
  const country = countryName(pub.country);
  const kind = typeLabel(pub.type);
  const platforms = pub.platforms
    .filter((p) => p !== "other" && p !== "multi")
    .map(platformLabel);
  const platformBit =
    platforms.length > 0 ? ` covering ${oxford(platforms)}` : "";
  const publisher = pub.publisher ? ` Published by ${pub.publisher}.` : "";
  const custom = pub.description?.trim();
  const run = years
    ? `${pub.title} ran from ${years} in the ${country}`
    : `${pub.title} was published in the ${country}`;
  const inventory =
    pub.readable === pub.issues && pub.issues > 0
      ? `This archive has the full ingested run: ${formatCount(pub.issues)} issues and ${formatCount(pub.pages)} pages, all readable online.`
      : pub.readable > 0
        ? `This archive lists ${formatCount(pub.issues)} issues (${formatCount(pub.pages)} pages); ${formatCount(pub.readable)} ${pub.readable === 1 ? "is" : "are"} readable online so far.`
        : `This archive lists ${formatCount(pub.issues)} issues (${formatCount(pub.pages)} pages). The online reader is still being added.`;
  const status =
    pub.status === "ceased"
      ? " The magazine is no longer published."
      : pub.status === "active"
        ? " The title is still published; we only host out-of-print issues we can share."
        : "";
  const article = /^[aeiou]/i.test(kind) ? "an" : "a";
  const lead = custom
    ? `${custom.replace(/\.$/, "")}. `
    : `${run} as ${article} ${kind}${platformBit}.`;
  return `${lead}${custom ? "" : " "}${inventory}${publisher}${status}`.replace(
    /\s+/g,
    " ",
  );
}

export function publicationH1(pub: CatalogPublication) {
  const years = yearSpan(pub);
  const complete = pub.readable > 0 && pub.readable === pub.issues;
  if (years && complete) return `${pub.title} — complete archive, ${years}`;
  if (years) return `${pub.title} — archive, ${years}`;
  return `${pub.title} — magazine archive`;
}

export function issueTitle(pubTitle: string, issue: CatalogIssue) {
  return `${pubTitle} Issue ${issue.number} (${issue.date})`;
}

export function issueDescription(pubTitle: string, issue: CatalogIssue) {
  const hook = issue.special ? ` ${issue.special}.` : "";
  const action = issue.readable
    ? "Read it online in the browser — no CBR or PDF download."
    : "Issue details and cover are here; the online reader is coming.";
  return `${pubTitle} issue ${issue.number}, ${issue.date}.${hook} ${issue.pages} pages. ${action}`;
}

export function issueH1(pubTitle: string, issue: CatalogIssue) {
  return `${pubTitle} Issue ${issue.number}, ${issue.date}`;
}

function oxford(items: string[]) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function publicationMetadata(pub: CatalogPublication, cover?: string): Metadata {
  const title = publicationTitle(pub);
  const description = publicationDescription(pub);
  const url = magazinePath(pub.id);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      images: cover ? [cover] : undefined,
    },
  };
}

export function issueMetadata(
  pubTitle: string,
  issue: CatalogIssue,
): Metadata {
  const title = issueTitle(pubTitle, issue);
  const description = issueDescription(pubTitle, issue);
  const url = issuePath(issue.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      images: [issue.cover],
    },
  };
}

export function catalogMetadata(): Metadata {
  const title = catalogTitle();
  const description = catalogDescription();
  return {
    title,
    description,
    alternates: { canonical: "/catalog" },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: "/catalog" },
  };
}

export function homeMetadata(): Metadata {
  const description = homeDescription();
  return {
    title: { absolute: homeTitle() },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title: homeTitle(),
      description,
      url: "/",
      images: ["/img/hero-desk.png"],
    },
  };
}

export function publicationJsonLd(pub: CatalogPublication, cover?: string) {
  const years = yearSpan(pub);
  return {
    "@context": "https://schema.org",
    "@type": "Periodical",
    name: pub.title,
    alternateName: pub.short !== pub.title ? pub.short : undefined,
    url: absoluteUrl(magazinePath(pub.id)),
    inLanguage: "en",
    startDate: pub.firstYear ? String(pub.firstYear) : undefined,
    endDate: pub.status === "ceased" && pub.lastYear ? String(pub.lastYear) : undefined,
    description: publicationDescription(pub),
    image: cover,
    publisher: pub.publisher
      ? { "@type": "Organization", name: pub.publisher.split(",")[0].trim() }
      : undefined,
    countryOfOrigin: countryName(pub.country),
    numberOfItems: pub.issues,
    temporalCoverage: years ?? undefined,
  };
}

export function issueJsonLd(pub: CatalogPublication, issue: CatalogIssue) {
  return {
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    name: issueTitle(pub.title, issue),
    issueNumber: issue.number,
    datePublished: issue.year !== 9999 ? String(issue.year) : undefined,
    url: absoluteUrl(issuePath(issue.slug)),
    image: issue.cover,
    pageStart: 1,
    pageEnd: issue.pages,
    isPartOf: {
      "@type": "Periodical",
      name: pub.title,
      url: absoluteUrl(magazinePath(pub.id)),
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
