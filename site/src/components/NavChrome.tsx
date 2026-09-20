"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthStatus } from "@/components/AuthStatus";
import rawPublications from "@/data/publications.json";
import type { CatalogPublication } from "@/lib/catalogMeta";
import { SITE_NAME } from "@/lib/seo";

const allMagazines = (rawPublications as CatalogPublication[])
  .filter((p) => p.issues > 0)
  .sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));

const SIDE_WIDE = "17.5rem";
const SIDE_MINI = "4.5rem";

const links: {
  href: string;
  label: string;
  short?: string;
  match: (path: string, hash: string) => boolean;
  icon: ReactNode;
}[] = [
  {
    href: "/catalog",
    label: "Catalog",
    match: (path: string) =>
      path === "/catalog" || path.startsWith("/magazines/") || path.startsWith("/years/"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3.5" y="4" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="4" width="7" height="7" rx="1.2" />
        <rect x="3.5" y="13" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="13" width="7" height="7" rx="1.2" />
      </svg>
    ),
  },
  {
    href: "/#reader",
    label: "Reader",
    match: (path: string, hash: string) => path === "/" && hash === "#reader",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z" />
        <path d="M12 6v13" />
      </svg>
    ),
  },
  {
    href: "/#eras",
    label: "Eras",
    match: (path: string, hash: string) => path === "/" && hash === "#eras",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    ),
  },
  {
    href: "/#picks",
    label: "Staff picks",
    short: "Picks",
    match: (path: string, hash: string) => path === "/" && hash === "#picks",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3.6l2.2 4.6 5 .7-3.6 3.5.9 5.1L12 15.2 7.5 17.5l.9-5.1L4.8 8.9l5-.7L12 3.6z" />
      </svg>
    ),
  },
];

export function NavFallback() {
  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          :root { --side-nav: ${SIDE_WIDE}; }
        }
      `}</style>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-paper/8 bg-ink">
        <div className="h-14" />
      </header>
      <aside
        className="fixed top-14 left-0 z-40 hidden h-[calc(100dvh-3.5rem)] border-r border-paper/8 bg-ink md:flex md:w-[17.5rem]"
        aria-hidden
      />
    </>
  );
}

export function NavChrome() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [wide, setWide] = useState(true);
  const [hash, setHash] = useState("");
  const [magQuery, setMagQuery] = useState("");
  const drawer = !wide;
  const selectedPubs = (searchParams.get("pub") ?? "").split(",").filter(Boolean);

  const magazineMatches = useMemo(() => {
    const n = magQuery.trim().toLowerCase();
    if (!n) return allMagazines;
    return allMagazines.filter(
      (p) => p.title.toLowerCase().includes(n) || p.short.toLowerCase().includes(n),
    );
  }, [magQuery]);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  useEffect(() => {
    setWide(true);
  }, [pathname]);

  useEffect(() => {
    if (wide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWide(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wide]);

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          :root { --side-nav: ${wide ? SIDE_WIDE : SIDE_MINI}; }
        }
      `}</style>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-paper/8 bg-ink">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWide((v) => !v)}
              aria-label="Menu"
              aria-expanded={!wide}
              className="grid size-10 place-items-center rounded-full text-paper transition hover:bg-paper/8"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2.5 pl-0.5">
              <span className="relative grid size-8 place-items-center overflow-hidden rounded-md bg-amber text-ink">
                <span className="font-display text-sm font-extrabold leading-none tracking-tight">
                  R
                </span>
                <span className="absolute inset-x-0 bottom-0 h-1 bg-ink/20" />
              </span>
              <span className="font-display text-base font-semibold tracking-tight">
                {SITE_NAME}
              </span>
            </Link>
          </div>

          <AuthStatus />
        </div>
      </header>

      {drawer && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setWide(true)}
          className="fixed inset-0 z-40 bg-ink/70 md:hidden"
        />
      )}

      <aside
        className={`fixed top-14 left-0 z-40 h-[calc(100dvh-3.5rem)] flex-col overflow-hidden border-r border-paper/8 bg-ink transition-[width] duration-200 ${
          drawer ? "flex w-[17.5rem]" : "hidden"
        } md:flex ${wide ? "md:w-[17.5rem]" : "md:w-[4.5rem]"}`}
      >
        <nav className="flex shrink-0 flex-col gap-0.5 p-2 pt-3" aria-label="Site">
          {links.map((l) => {
            const active = l.match(pathname, hash);
            return (
              <Link
                key={l.href}
                href={l.href}
                title={l.label}
                onClick={() => setWide(true)}
                className={`flex items-center gap-5 rounded-xl px-3 py-2.5 text-[15px] transition ${
                  wide ? "" : "md:flex-col md:items-center md:gap-1 md:px-1 md:py-3 md:text-center"
                } ${
                  active
                    ? "bg-paper/10 font-medium text-paper"
                    : "text-paper-dim hover:bg-paper/6 hover:text-paper"
                }`}
              >
                <span className="grid size-6 shrink-0 place-items-center [&>svg]:size-6">
                  {l.icon}
                </span>
                <span className={wide ? "" : "md:hidden"}>{l.label}</span>
                {!wide && (
                  <span className="hidden whitespace-nowrap text-[10px] leading-none md:block">
                    {l.short ?? l.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mt-2 border-t border-paper/8" />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className={`shrink-0 px-4 pb-1 pt-3 ${wide ? "" : "md:px-2 md:text-center"}`}>
            <p className={`font-mono text-[11px] uppercase tracking-[0.18em] text-paper-dim ${wide ? "" : "md:hidden"}`}>
              Magazines
            </p>
            {wide && (
              <input
                value={magQuery}
                onChange={(e) => setMagQuery(e.target.value)}
                placeholder="Find a magazine"
                className="mt-2 w-full rounded-lg border border-paper/10 bg-ink-2 px-2.5 py-1.5 text-sm outline-none placeholder:text-paper-dim/60 focus:border-amber/50"
                aria-label="Find a magazine"
              />
            )}
          </div>
          <nav className="rail-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4" aria-label="Magazines">
            {magazineMatches.length === 0 ? (
              <p className="px-2 py-3 text-sm text-paper-dim">No magazines match.</p>
            ) : (
              magazineMatches.map((p) => {
                const href = `/catalog?pub=${p.id}`;
                const active = pathname === "/catalog" && selectedPubs.includes(p.id);
                const mark = (p.short || p.title).slice(0, 2);
                return (
                  <Link
                    key={p.id}
                    href={href}
                    title={p.title}
                    onClick={() => setWide(true)}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-sm transition ${
                      wide ? "" : "md:justify-center md:px-1"
                    } ${
                      active
                        ? "bg-paper/10 font-medium text-paper"
                        : "text-paper-dim hover:bg-paper/6 hover:text-paper"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold uppercase ${
                        active ? "bg-amber text-ink" : "bg-ink-3 text-paper"
                      }`}
                    >
                      {mark}
                    </span>
                    <span className={`min-w-0 flex-1 truncate ${wide ? "" : "md:hidden"}`}>{p.title}</span>
                    <span className={`shrink-0 tabular-nums text-paper-dim ${wide ? "" : "md:hidden"}`}>
                      {p.issues}
                    </span>
                  </Link>
                );
              })
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
