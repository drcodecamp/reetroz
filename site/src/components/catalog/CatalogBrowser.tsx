"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IssueCard } from "@/components/IssueCard";
import {
  ERAS,
  MAX_YEAR,
  MIN_YEAR,
  YEARS,
  type CatalogIssue,
  type CatalogPublication,
  type EraKey,
} from "@/lib/catalog";
import { useProgress } from "@/lib/progress";

type View = "rows" | "grid";
type Sort = "oldest" | "newest" | "longest" | "shortest";
type Length = "short" | "medium" | "long";

const LENGTHS: { key: Length; label: string; test: (p: number) => boolean }[] = [
  { key: "short", label: "Under 100 pages", test: (p) => p < 100 },
  { key: "medium", label: "100 – 200 pages", test: (p) => p >= 100 && p < 200 },
  { key: "long", label: "200+ pages", test: (p) => p >= 200 },
];

function parseList<T extends string>(v: string | null): T[] {
  return v ? (v.split(",").filter(Boolean) as T[]) : [];
}

export function CatalogBrowser({
  issues,
  publications,
}: {
  issues: CatalogIssue[];
  publications: CatalogPublication[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const pubs = parseList<string>(params.get("pub"));
  const [pubQuery, setPubQuery] = useState("");
  const eras = parseList<EraKey>(params.get("era"));
  const lengths = parseList<Length>(params.get("len"));
  const from = Number(params.get("from") ?? MIN_YEAR);
  const to = Number(params.get("to") ?? MAX_YEAR);
  const view = (params.get("view") as View) ?? "rows";
  const sort = (params.get("sort") as Sort) ?? "oldest";
  const readable = params.get("readable") === "1";
  const continueOnly = params.get("continue") === "1";

  const progress = useProgress();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // null removes a param, undefined leaves it untouched
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
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    update({ [key]: next.join(",") || null });
  }

  const pubById = useMemo(
    () => new Map(publications.map((p) => [p.id, p])),
    [publications],
  );

  // Every filter except the publication facet, so the facet can show
  // "how many issues would each magazine contribute" counts.
  const matchesBase = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (i: CatalogIssue) => {
      if (i.year < from || i.year > to) return false;
      if (eras.length && !eras.includes(i.era)) return false;
      if (lengths.length && !lengths.some((l) => LENGTHS.find((x) => x.key === l)!.test(i.pages)))
        return false;
      if (readable && !i.readable) return false;
      if (continueOnly && !progress[i.slug]) return false;
      if (needle) {
        const pub = pubById.get(i.publication);
        const hay = `${i.number} ${i.date} ${i.year} #${i.number} ${pub?.title ?? ""} ${pub?.short ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    };
  }, [q, from, to, eras, lengths, readable, continueOnly, progress, pubById]);

  const pubCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of issues) if (matchesBase(i)) counts.set(i.publication, (counts.get(i.publication) ?? 0) + 1);
    return counts;
  }, [issues, matchesBase]);

  const filtered = useMemo(() => {
    let list = issues.filter((i) => matchesBase(i) && (!pubs.length || pubs.includes(i.publication)));
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "newest":
          return issues.indexOf(b) - issues.indexOf(a);
        case "longest":
          return b.pages - a.pages;
        case "shortest":
          return a.pages - b.pages;
        default:
          return issues.indexOf(a) - issues.indexOf(b);
      }
    });
    return list;
  }, [issues, matchesBase, pubs, sort]);

  const activeCount =
    (q ? 1 : 0) +
    pubs.length +
    eras.length +
    lengths.length +
    (from !== MIN_YEAR || to !== MAX_YEAR ? 1 : 0) +
    (readable ? 1 : 0) +
    (continueOnly ? 1 : 0);

  const byYear = useMemo(() => {
    const map = new Map<number, CatalogIssue[]>();
    for (const i of filtered) {
      if (!map.has(i.year)) map.set(i.year, []);
      map.get(i.year)!.push(i);
    }
    return [...map.entries()].sort((a, b) =>
      sort === "newest" ? b[0] - a[0] : a[0] - b[0],
    );
  }, [filtered, sort]);

  const filters = (
    <div className="space-y-7">
      <div>
        <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
          Search
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-paper/10 bg-ink-2 px-3 py-2 focus-within:border-amber/50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-paper-dim" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            value={q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Magazine, issue #, month or year"
            className="w-full bg-transparent text-sm outline-none placeholder:text-paper-dim/60"
          />
        </div>
      </div>

      <fieldset className="min-w-0 max-w-full">
        <legend className="flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
          Magazine
          <span className="text-paper">
            {publications.filter((p) => (pubCounts.get(p.id) ?? 0) > 0).length} with issues
          </span>
        </legend>
        <input
          value={pubQuery}
          onChange={(e) => setPubQuery(e.target.value)}
          placeholder="Find a magazine"
          className="mt-2 w-full rounded-lg border border-paper/10 bg-ink-2 px-3 py-1.5 text-sm outline-none placeholder:text-paper-dim/60 focus:border-amber/50"
          aria-label="Find a magazine"
        />
        <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {publications
            .filter((p) => {
              const n = pubQuery.trim().toLowerCase();
              return !n || p.title.toLowerCase().includes(n) || p.short.toLowerCase().includes(n);
            })
            .map((p) => ({ p, count: pubCounts.get(p.id) ?? 0 }))
            .sort((a, b) => {
              const aOn = pubs.includes(a.p.id) ? 1 : 0;
              const bOn = pubs.includes(b.p.id) ? 1 : 0;
              return bOn - aOn || b.count - a.count || a.p.title.localeCompare(b.p.title);
            })
            .map(({ p, count }) => {
              const on = pubs.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggleIn("pub", pubs, p.id)}
                    aria-pressed={on}
                    title={`${p.title}${p.firstYear ? ` · ${p.firstYear}–${p.lastYear ?? ""}` : ""}${p.issues === 0 ? " · not ingested yet" : ""}`}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[13px] transition ${
                      on
                        ? "bg-amber/10 text-paper"
                        : count > 0
                          ? "text-paper-dim hover:bg-paper/5 hover:text-paper"
                          : "text-paper-dim/45 hover:bg-paper/5 hover:text-paper-dim"
                    }`}
                  >
                    <span className="min-w-0 truncate">{p.title}</span>
                    <span
                      className={`shrink-0 rounded-full px-1.5 font-mono text-[10px] tabular-nums ${
                        count > 0 ? "bg-paper/10 text-paper" : "text-paper-dim/50"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
          Era
        </legend>
        <div className="mt-2 grid gap-1.5">
          {ERAS.map((e) => {
            const on = eras.includes(e.key);
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => toggleIn("era", eras, e.key)}
                aria-pressed={on}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                  on
                    ? "border-amber/60 bg-amber/10 text-paper"
                    : "border-paper/8 bg-ink-2/60 text-paper-dim hover:border-paper/25 hover:text-paper"
                }`}
              >
                <span>{e.label}</span>
                <span className="font-mono text-[10px] tracking-[0.16em]">{e.short}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
          Years
          <span className="text-paper">
            {from} – {to}
          </span>
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={from}
            onChange={(e) => {
              const v = Number(e.target.value);
              update({ from: v === MIN_YEAR ? null : String(v), to: v > to ? String(v) : undefined });
            }}
            className="rounded-lg border border-paper/10 bg-ink-2 px-2 py-1.5 text-sm"
            aria-label="From year"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={to}
            onChange={(e) => {
              const v = Number(e.target.value);
              update({ to: v === MAX_YEAR ? null : String(v), from: v < from ? String(v) : undefined });
            }}
            className="rounded-lg border border-paper/10 bg-ink-2 px-2 py-1.5 text-sm"
            aria-label="To year"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
          Length
        </legend>
        <div className="mt-2 grid gap-1.5">
          {LENGTHS.map((l) => (
            <label key={l.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-paper-dim hover:text-paper">
              <input
                type="checkbox"
                checked={lengths.includes(l.key)}
                onChange={() => toggleIn("len", lengths, l.key)}
                className="size-4 accent-amber"
              />
              {l.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-1.5">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-paper-dim hover:text-paper">
          <input
            type="checkbox"
            checked={readable}
            onChange={() => update({ readable: readable ? null : "1" })}
            className="size-4 accent-amber"
          />
          Readable online only
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-paper-dim hover:text-paper">
          <input
            type="checkbox"
            checked={continueOnly}
            onChange={() => update({ continue: continueOnly ? null : "1" })}
            className="size-4 accent-amber"
          />
          Continue reading
        </label>
      </fieldset>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="text-sm text-amber hover:text-amber-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-28">{filters}</div>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-[76px] z-30 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 bg-ink/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
            <p className="text-sm text-paper-dim">
              <span className="font-display text-lg font-semibold text-paper">
                {filtered.length}
              </span>{" "}
              of {issues.length} issues
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-3.5 py-1.5 text-sm lg:hidden"
              >
                Filters{activeCount ? ` (${activeCount})` : ""}
              </button>
              <div className="flex overflow-hidden rounded-full border border-paper/15 text-sm">
                {(["rows", "grid"] as View[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update({ view: v === "rows" ? null : v })}
                    aria-pressed={view === v}
                    className={`px-3.5 py-1.5 capitalize transition ${
                      view === v ? "bg-paper text-ink" : "text-paper-dim hover:text-paper"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value === "oldest" ? null : e.target.value })}
                className="rounded-full border border-paper/15 bg-ink px-3.5 py-1.5 text-sm"
                aria-label="Sort"
              >
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
                <option value="longest">Most pages</option>
                <option value="shortest">Fewest pages</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper/15 p-16 text-center text-paper-dim">
              Nothing matches those filters.
            </div>
          ) : view === "grid" ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
              {filtered.map((i, idx) => (
                <li key={i.slug}>
                  <IssueCard issue={i} progress={progress[i.slug]} sizes="(max-width: 640px) 45vw, 200px" priority={idx < 8} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-12">
              {byYear.map(([year, list]) => (
                <section key={year} id={`y${year}`}>
                  <div className="mb-4 flex items-baseline gap-4">
                    <h2 className="font-display text-3xl font-bold tracking-tight">
                      {year}
                    </h2>
                    <span className="hairline flex-1" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim">
                      {list.length} issue{list.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="mask-fade-r flex gap-4 overflow-x-auto pb-4 pr-10 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {list.map((i) => (
                      <li key={i.slug} className="w-[150px] shrink-0 sm:w-[180px]">
                        <IssueCard issue={i} progress={progress[i.slug]} sizes="180px" />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-paper/10 bg-ink-2 p-6 pb-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-full bg-amber px-4 py-1.5 text-sm font-semibold text-ink"
              >
                Show {filtered.length}
              </button>
            </div>
            {filters}
          </div>
        </div>
      )}
    </div>
  );
}
