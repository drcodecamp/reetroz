import {
  MAX_YEAR,
  MIN_YEAR,
  catalog,
  compareIssueNumber,
  getPublication,
  isUndated,
  type CatalogIssue,
  type EraKey,
} from "@/lib/catalog";

export type ViewKey = "rows" | "grid";
export type SortKey = "oldest" | "newest" | "longest" | "shortest";
export type LengthKey = "short" | "medium" | "long";

export const LENGTHS: { key: LengthKey; label: string; test: (p: number) => boolean }[] = [
  { key: "short", label: "Under 100 pages", test: (p) => p < 100 },
  { key: "medium", label: "100 – 200 pages", test: (p) => p >= 100 && p < 200 },
  { key: "long", label: "200+ pages", test: (p) => p >= 200 },
];

export const GRID_PAGE = 48;
export const ROW_PREVIEW = 10;

export type CatalogFilters = {
  q: string;
  pubs: string[];
  eras: EraKey[];
  lengths: LengthKey[];
  from: number;
  to: number;
  readable: boolean;
  slugs: string[];
};

export type CatalogQuery = CatalogFilters & {
  sort: SortKey;
  view: ViewKey;
  year: number | null;
  limit: number;
  offset: number;
};

export type YearCount = { year: number; count: number };

export type CatalogQueryResult = {
  total: number;
  filtered: number;
  defaultYear: number | null;
  years: YearCount[];
  pubCounts: Record<string, number>;
  issues: CatalogIssue[];
};

function parseList(value: string | null | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function parseCatalogSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): CatalogQuery {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    const value = params[key];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  };

  const fromRaw = Number(get("from") ?? MIN_YEAR);
  const toRaw = Number(get("to") ?? MAX_YEAR);
  const yearRaw = get("year");
  const limitRaw = Number(get("limit") ?? 0);
  const offsetRaw = Number(get("offset") ?? 0);
  const sort = (get("sort") as SortKey) || "newest";
  const view = (get("view") as ViewKey) || "rows";

  return {
    q: get("q") ?? "",
    pubs: parseList(get("pub")),
    eras: parseList(get("era")) as EraKey[],
    lengths: parseList(get("len")) as LengthKey[],
    from: Number.isFinite(fromRaw) ? fromRaw : MIN_YEAR,
    to: Number.isFinite(toRaw) ? toRaw : MAX_YEAR,
    readable: get("readable") === "1",
    slugs: parseList(get("slugs")),
    sort: ["oldest", "newest", "longest", "shortest"].includes(sort) ? sort : "newest",
    view: view === "grid" ? "grid" : "rows",
    year: yearRaw && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : null,
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : view === "grid" ? GRID_PAGE : 0,
    offset: Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0,
  };
}

export function catalogSearchString(
  query: Partial<CatalogQuery>,
  extras: Record<string, string | null | undefined> = {},
): string {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.pubs?.length) sp.set("pub", query.pubs.join(","));
  if (query.eras?.length) sp.set("era", query.eras.join(","));
  if (query.lengths?.length) sp.set("len", query.lengths.join(","));
  if (query.from != null && query.from !== MIN_YEAR) sp.set("from", String(query.from));
  if (query.to != null && query.to !== MAX_YEAR) sp.set("to", String(query.to));
  if (query.readable) sp.set("readable", "1");
  if (query.slugs?.length) sp.set("slugs", query.slugs.join(","));
  if (query.sort && query.sort !== "newest") sp.set("sort", query.sort);
  if (query.view && query.view !== "rows") sp.set("view", query.view);
  if (query.year != null) sp.set("year", String(query.year));
  if (query.limit && query.view === "grid") sp.set("limit", String(query.limit));
  if (query.offset) sp.set("offset", String(query.offset));
  for (const [key, value] of Object.entries(extras)) {
    if (value == null || value === "") sp.delete(key);
    else sp.set(key, value);
  }
  return sp.toString();
}

function matchesFilters(
  issue: CatalogIssue,
  filters: CatalogFilters,
  pubTitle: (id: string) => string,
): boolean {
  if (isUndated(issue.year)) {
    if (filters.from !== MIN_YEAR || filters.to !== MAX_YEAR) return false;
  } else if (issue.year < filters.from || issue.year > filters.to) {
    return false;
  }
  if (filters.eras.length && !filters.eras.includes(issue.era)) return false;
  if (
    filters.lengths.length &&
    !filters.lengths.some((key) => LENGTHS.find((item) => item.key === key)!.test(issue.pages))
  ) {
    return false;
  }
  if (filters.readable && !issue.readable) return false;
  if (filters.slugs.length && !filters.slugs.includes(issue.slug)) return false;
  const needle = filters.q.trim().toLowerCase();
  if (needle) {
    const hay = `${issue.number} ${issue.date} ${issue.year} #${issue.number} ${pubTitle(issue.publication)}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

function sortIssues(list: CatalogIssue[], sort: SortKey): CatalogIssue[] {
  return [...list].sort((a, b) => {
    const aU = isUndated(a.year);
    const bU = isUndated(b.year);
    if (aU !== bU) return aU ? 1 : -1;
    switch (sort) {
      case "newest":
        return a.year !== b.year ? b.year - a.year : compareIssueNumber(b, a);
      case "longest":
        return b.pages - a.pages;
      case "shortest":
        return a.pages - b.pages;
      default:
        return a.year !== b.year ? a.year - b.year : compareIssueNumber(a, b);
    }
  });
}

function yearOrder(years: YearCount[], sort: SortKey): YearCount[] {
  return [...years].sort((a, b) => {
    const aU = isUndated(a.year);
    const bU = isUndated(b.year);
    if (aU !== bU) return aU ? 1 : -1;
    return sort === "newest" ? b.year - a.year : a.year - b.year;
  });
}

export function queryCatalog(query: CatalogQuery): CatalogQueryResult {
  const pubTitle = (id: string) => {
    const pub = getPublication(id);
    return `${pub?.title ?? ""} ${pub?.short ?? ""}`.trim();
  };
  const matchesBase = (issue: CatalogIssue) => matchesFilters(issue, { ...query, pubs: [] }, pubTitle);
  const matchesAll = (issue: CatalogIssue) =>
    matchesBase(issue) && (!query.pubs.length || query.pubs.includes(issue.publication));

  const pubCounts: Record<string, number> = {};
  const yearMap = new Map<number, number>();
  const matched: CatalogIssue[] = [];

  for (const issue of catalog) {
    if (matchesBase(issue)) {
      pubCounts[issue.publication] = (pubCounts[issue.publication] ?? 0) + 1;
    }
    if (!matchesAll(issue)) continue;
    matched.push(issue);
    yearMap.set(issue.year, (yearMap.get(issue.year) ?? 0) + 1);
  }

  const years = yearOrder(
    [...yearMap.entries()].map(([year, count]) => ({ year, count })),
    query.sort,
  );
  const defaultYear = years[0]?.year ?? null;
  const sorted = sortIssues(matched, query.sort);

  let issues: CatalogIssue[];
  if (query.view === "grid") {
    issues = sorted.slice(query.offset, query.offset + (query.limit || GRID_PAGE));
  } else if (query.year != null) {
    issues = sorted.filter((issue) => issue.year === query.year);
  } else {
    const taken = new Map<number, number>();
    issues = [];
    for (const issue of sorted) {
      const n = taken.get(issue.year) ?? 0;
      if (n >= ROW_PREVIEW) continue;
      taken.set(issue.year, n + 1);
      issues.push(issue);
    }
  }

  return {
    total: catalog.length,
    filtered: matched.length,
    defaultYear,
    years,
    pubCounts,
    issues,
  };
}
