"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IssueCard } from "@/components/IssueCard";
import { magazinePath, yearPath } from "@/lib/seo";
import { isUndated, type CatalogIssue, type CatalogPublication } from "@/lib/catalogMeta";
import {
  GRID_PAGE,
  LENGTHS,
  ROW_PREVIEW,
  type CatalogQuery,
  type CatalogQueryResult,
  type LengthKey,
  type SortKey,
  type ViewKey,
} from "@/lib/catalogQuery";
import { useProgress } from "@/lib/progress";

function parseList<T extends string>(v: string | null): T[] {
  return v ? (v.split(",").filter(Boolean) as T[]) : [];
}

function groupByYear(issues: CatalogIssue[]) {
  const map = new Map<number, CatalogIssue[]>();
  for (const issue of issues) {
    const list = map.get(issue.year) ?? [];
    list.push(issue);
    map.set(issue.year, list);
  }
  return map;
}

function YearRow({
  year,
  issues,
  publications,
  progress,
}: {
  year: number;
  issues: CatalogIssue[];
  publications: Map<string, CatalogPublication>;
  progress: ReturnType<typeof useProgress>;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const label = isUndated(year) ? "undated" : String(year);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, issues.length]);

  function scrollByPage(dir: -1 | 1) {
    scroller.current?.scrollBy({ left: dir * Math.max((scroller.current.clientWidth || 360) * 0.8, 360), behavior: "smooth" });
  }

  return (
    <div className="relative">
      <ul
        ref={scroller}
        className="mask-fade-r flex gap-4 overflow-x-auto pb-4 pr-14 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {issues.map((i) => (
          <li key={`${i.id}-${i.date}-${i.pages}`} className="w-[150px] shrink-0 sm:w-[180px]">
            <IssueCard
              issue={i}
              publication={publications.get(i.publication)}
              progress={progress[i.slug]}
              sizes="180px"
            />
          </li>
        ))}
      </ul>
      {showLeft && (
        <button
          type="button"
          aria-label={`Previous ${label} issues`}
          onClick={() => scrollByPage(-1)}
          className="absolute left-0 top-[4.4rem] z-10 flex size-10 items-center justify-center rounded-full border border-paper/15 bg-ink/90 text-paper shadow-lg backdrop-blur transition hover:border-amber hover:text-amber sm:top-[5.2rem]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}
      {showRight && (
        <button
          type="button"
          aria-label={`More ${label} issues`}
          onClick={() => scrollByPage(1)}
          className="absolute right-0 top-[4.4rem] z-10 flex size-10 items-center justify-center rounded-full border border-paper/15 bg-ink/90 text-paper shadow-lg backdrop-blur transition hover:border-amber hover:text-amber sm:top-[5.2rem]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

async function fetchCatalog(search: string): Promise<CatalogQueryResult> {
  const res = await fetch(`/api/catalog?${search}`);
  if (!res.ok) throw new Error(`Catalog query failed (${res.status})`);
  return res.json();
}

export function CatalogBrowser({
  publications,
  years,
  minYear,
  maxYear,
  initialQuery,
  initial,
}: {
  publications: CatalogPublication[];
  years: number[];
  minYear: number;
  maxYear: number;
  initialQuery: CatalogQuery;
  initial: CatalogQueryResult;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const pubs = parseList<string>(params.get("pub"));
  const [qInput, setQInput] = useState(q);
  const lengths = parseList<LengthKey>(params.get("len"));
  const from = Number(params.get("from") ?? minYear);
  const to = Number(params.get("to") ?? maxYear);
  const view = ((params.get("view") as ViewKey) ?? "grid") as ViewKey;
  const sort = ((params.get("sort") as SortKey) ?? "newest") as SortKey;
  const readable = params.get("readable") === "1";
  const continueOnly = params.get("continue") === "1";

  const progress = useProgress();
  const [result, setResult] = useState(initial);
  const [yearIssues, setYearIssues] = useState<Map<number, CatalogIssue[]>>(() =>
    groupByYear(initial.issues),
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const skipFirst = useRef(true);

  useEffect(() => {
    setQInput(q);
  }, [q]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (qInput === q) return;
      update({ q: qInput || null });
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce URL from local search box
  }, [qInput]);

  function update(next: Record<string, string | null | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) continue;
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  function toggleIn<T extends string>(key: string, list: T[], value: T) {
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    update({ [key]: next.join(",") || null });
  }

  const pubById = useMemo(() => new Map(publications.map((p) => [p.id, p])), [publications]);

  const apiSearch = useCallback(
    (extra: Record<string, string | null> = {}) => {
      const sp = new URLSearchParams(params.toString());
      sp.delete("continue");
      if (continueOnly) {
        const slugs = Object.keys(progress);
        if (slugs.length) sp.set("slugs", slugs.join(","));
        else sp.set("slugs", "__none__");
      }
      for (const [k, v] of Object.entries(extra)) {
        if (v == null) sp.delete(k);
        else sp.set(k, v);
      }
      return sp.toString();
    },
    [params, continueOnly, progress],
  );

  useEffect(() => {
    if (skipFirst.current && !continueOnly) {
      skipFirst.current = false;
      return;
    }
    let cancelled = false;
    fetchCatalog(apiSearch()).then((data) => {
      if (cancelled) return;
      setResult(data);
      if (view === "rows") setYearIssues(groupByYear(data.issues));
    });
    return () => {
      cancelled = true;
    };
  }, [apiSearch, continueOnly, view]);

  function showAllHref(year: number) {
    if (pubs.length === 1) return magazinePath(pubs[0]);
    return yearPath(year);
  }

  async function loadMore() {
    if (loadingMore || result.issues.length >= result.filtered) return;
    setLoadingMore(true);
    try {
      const data = await fetchCatalog(
        apiSearch({
          view: "grid",
          offset: String(result.issues.length),
          limit: String(GRID_PAGE),
        }),
      );
      setResult((current) => ({ ...data, issues: [...current.issues, ...data.issues] }));
    } finally {
      setLoadingMore(false);
    }
  }

  const activeCount =
    (q ? 1 : 0) +
    pubs.length +
    lengths.length +
    (from !== minYear || to !== maxYear ? 1 : 0) +
    (readable ? 1 : 0) +
    (continueOnly ? 1 : 0);

  const control =
    "h-10 rounded-full border border-paper/15 bg-ink px-3.5 text-base text-paper outline-none transition hover:border-paper/40";

  return (
    <div>
      <div className="min-w-0">
        <div className="sticky top-14 z-40 space-y-2.5 bg-ink px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-paper/15 bg-ink-2 px-3.5 focus-within:border-amber/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-paper-dim" aria-hidden>
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search magazine, issue #, month or year"
                className="w-full bg-transparent text-base outline-none placeholder:text-paper-dim/60"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={from}
              onChange={(e) => {
                const v = Number(e.target.value);
                update({ from: v === minYear ? null : String(v), to: v > to ? String(v) : undefined });
              }}
              className={control}
              aria-label="From year"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="text-paper-dim">–</span>
            <select
              value={to}
              onChange={(e) => {
                const v = Number(e.target.value);
                update({ to: v === maxYear ? null : String(v), from: v < from ? String(v) : undefined });
              }}
              className={control}
              aria-label="To year"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <div className="flex overflow-hidden rounded-full border border-paper/15 text-base">
              {LENGTHS.map((l) => {
                const on = lengths.includes(l.key);
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => toggleIn("len", lengths, l.key)}
                    aria-pressed={on}
                    className={`h-10 px-3 transition ${on ? "bg-paper text-ink" : "text-paper-dim hover:text-paper"}`}
                  >
                    {l.key === "short" ? "Under 100" : l.key === "medium" ? "100–200" : "200+"}
                  </button>
                );
              })}
            </div>

            <div className="flex overflow-hidden rounded-full border border-paper/15 text-base">
              {([
                ["rows", "By Year"],
                ["grid", "All"],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update({ view: v === "grid" ? null : v })}
                  aria-pressed={view === v}
                  className={`h-10 px-3.5 transition ${
                    view === v ? "bg-paper text-ink" : "text-paper-dim hover:text-paper"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value === "newest" ? null : e.target.value })}
              className={control}
              aria-label="Sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="longest">Most pages</option>
              <option value="shortest">Fewest pages</option>
            </select>

            <p className="ml-auto text-base text-paper-dim">
              <span className="font-display text-lg font-semibold text-paper">{result.filtered}</span>
              {" "}of {result.total}
            </p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => router.replace(pathname, { scroll: false })}
                className="text-base text-amber hover:text-amber-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0 px-4 pt-4 sm:px-5">
          {pubs.length === 1 && pubById.get(pubs[0]) && (
            <p className="mb-4 rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 text-base text-paper-dim">
              Looking for the full run? Open the{" "}
              <Link
                href={magazinePath(pubs[0])}
                className="font-medium text-amber hover:text-amber-2"
              >
                {pubById.get(pubs[0])!.title} archive
              </Link>
              .
            </p>
          )}

          {result.filtered === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper/15 p-16 text-center text-paper-dim">
              Nothing matches those filters.
            </div>
          ) : view === "grid" ? (
            <>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
                {result.issues.map((i, idx) => (
                  <li key={`${i.id}-${idx}`}>
                    <IssueCard
                      issue={i}
                      publication={pubById.get(i.publication)}
                      progress={progress[i.slug]}
                      sizes="(max-width: 640px) 45vw, 200px"
                      priority={idx < 8}
                    />
                  </li>
                ))}
              </ul>
              {result.issues.length < result.filtered && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full bg-amber px-5 py-2 text-base font-semibold text-ink disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : `Load more (${result.issues.length} of ${result.filtered})`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-12">
              {result.years.map(({ year, count }) => {
                const issues = yearIssues.get(year) ?? [];
                return (
                  <section key={year} id={`y${year}`} className="scroll-mt-44">
                    <div className="mb-4 flex items-baseline gap-4">
                      <h3 className="font-display text-3xl font-bold tracking-tight">
                        {isUndated(year) ? "Undated" : year}
                      </h3>
                      {count > ROW_PREVIEW && (
                        <Link
                          href={showAllHref(year)}
                          className="rounded-full border border-paper/15 px-3 py-1 text-base text-amber transition hover:border-amber"
                        >
                          Show all
                        </Link>
                      )}
                      <span className="hairline flex-1" />
                      <span className="text-base text-paper-dim">
                        {count} issue{count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <YearRow year={year} issues={issues} publications={pubById} progress={progress} />
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
