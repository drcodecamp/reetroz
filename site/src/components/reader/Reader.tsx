"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pageUrl, type CatalogIssue } from "@/lib/catalog";
import type { IssueManifest } from "@/lib/manifest";
import { saveProgress, useMediaQuery, useSpeed } from "@/lib/progress";

const SPEEDS = [2, 3, 5, 8, 12, 20];
const IDLE_MS = 2600;

type Props = {
  issue: CatalogIssue;
  manifest: IssueManifest;
  initialPage: number;
  autoplay: boolean;
};

/** Magazine convention: cover alone, then 2–3, 4–5, ... */
function spreadFor(page: number, total: number): number[] {
  if (page <= 1) return [1];
  const start = page % 2 === 0 ? page : page - 1;
  return start + 1 <= total ? [start, start + 1] : [start];
}

export function Reader({ issue, manifest, initialPage, autoplay }: Props) {
  const total = manifest.pages;
  const clamp = useCallback(
    (p: number) => Math.min(total, Math.max(1, Math.round(p))),
    [total],
  );

  const [page, setPage] = useState(() => clamp(initialPage));
  const [playing, setPlayingRaw] = useState(autoplay);
  const [speed, setSpeed] = useSpeed();
  const wide = useMediaQuery("(min-width: 1024px)");
  const [spreadOverride, setSpreadOverride] = useState<boolean | null>(null);
  const spread = spreadOverride ?? wide;
  const setSpread = useCallback(
    (fn: (v: boolean) => boolean) => setSpreadOverride((o) => fn(o ?? wide)),
    [wide],
  );
  const [zoomed, setZoomed] = useState(false);
  const [drift, setDrift] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [elapsed, setElapsed] = useState(0); // 0..1 progress of current page timer

  // Pausing always brings the controls back.
  const setPlaying = useCallback((next: boolean | ((v: boolean) => boolean)) => {
    setPlayingRaw((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      if (!value) setUiVisible(true);
      return value;
    });
  }, []);

  const idleTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  // --- derived --------------------------------------------------------------
  const pagesShown = useMemo(
    () => (spread ? spreadFor(page, total) : [page]),
    [spread, page, total],
  );
  const meta = manifest.pageList[page - 1];
  const ambient = meta?.color ?? "#06080f";

  // --- navigation -------------------------------------------------------------
  const goTo = useCallback(
    (p: number, opts: { keepPlaying?: boolean } = {}) => {
      const next = clamp(p);
      setPage(next);
      setElapsed(0);
      if (!opts.keepPlaying) setPlaying(false);
    },
    [clamp, setPlaying],
  );

  const advance = useCallback(
    (dir: 1 | -1, opts: { keepPlaying?: boolean } = {}) => {
      if (spread) {
        const shown = spreadFor(page, total);
        const target =
          dir === 1 ? shown[shown.length - 1] + 1 : shown[0] - 1;
        if (target < 1 || target > total) {
          if (dir === 1) setPlaying(false);
          return;
        }
        goTo(target, opts);
      } else {
        if (page + dir < 1 || page + dir > total) {
          if (dir === 1) setPlaying(false);
          return;
        }
        goTo(page + dir, opts);
      }
    },
    [spread, page, total, goTo, setPlaying],
  );

  // --- autoplay timer -----------------------------------------------------------
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const started = performance.now();
    const duration = speed * 1000;
    const tick = (now: number) => {
      const t = (now - started) / duration;
      if (t >= 1) {
        advance(1, { keepPlaying: true });
        return;
      }
      setElapsed(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, page, advance]);

  // --- persistence + URL ------------------------------------------------------
  useEffect(() => {
    saveProgress(issue.slug, page, total);
    const url = new URL(window.location.href);
    url.searchParams.set("p", String(page));
    url.searchParams.delete("play");
    window.history.replaceState(null, "", url);
  }, [issue.slug, page, total]);

  // --- preload next pages -----------------------------------------------------
  useEffect(() => {
    const ahead = [1, 2, 3, 4].map((d) => page + d).filter((p) => p <= total);
    const behind = [page - 1].filter((p) => p >= 1);
    for (const p of [...ahead, ...behind]) {
      const img = new Image();
      img.src = pageUrl(issue.slug, p, "read");
    }
  }, [page, total, issue.slug]);

  // --- filmstrip follows current page ----------------------------------------
  useEffect(() => {
    const el = filmstripRef.current?.querySelector<HTMLElement>(
      `[data-page="${page}"]`,
    );
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [page, uiVisible]);

  // --- idle hide --------------------------------------------------------------
  const scheduleHide = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    if (!playing) return; // controls stay visible while paused
    idleTimer.current = window.setTimeout(() => {
      if (!speedOpen && !scrubbing) setUiVisible(false);
    }, IDLE_MS);
  }, [playing, speedOpen, scrubbing]);

  const poke = useCallback(() => {
    setUiVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [scheduleHide]);

  // --- keyboard ---------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          setPlaying((v) => !v);
          break;
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          advance(1);
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          advance(-1);
          break;
        case "Home":
          goTo(1);
          break;
        case "End":
          goTo(total);
          break;
        case "ArrowUp":
        case "]":
          setSpeed(speed - 1);
          break;
        case "ArrowDown":
        case "[":
          setSpeed(speed + 1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "s":
        case "S":
          setSpread((v) => !v);
          break;
        case "z":
        case "Z":
          setZoomed((v) => !v);
          break;
        case "Escape":
          if (zoomed) setZoomed(false);
          else if (document.fullscreenElement) document.exitFullscreen();
          break;
      }
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, goTo, total, zoomed, poke, speed, setSpeed, setSpread, setPlaying]);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  }

  const pct = ((page - 1) / Math.max(1, total - 1)) * 100;
  const ring = 2 * Math.PI * 17;

  return (
    <div
      ref={rootRef}
      onMouseMove={poke}
      onTouchStart={poke}
      className={`relative h-[100dvh] w-full select-none overflow-hidden bg-ink text-paper ${uiVisible ? "" : "cursor-none"}`}
      style={{
        background: `radial-gradient(120% 90% at 50% 40%, ${ambient}55 0%, #06080f 70%)`,
        transition: "background 900ms ease",
      }}
    >
      {/* ---------- pages ---------- */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${zoomed ? "overflow-auto" : ""}`}
        style={{ padding: zoomed ? 0 : "56px 24px 128px" }}
        onClick={(e) => {
          if (zoomed) return;
          const x = e.clientX / window.innerWidth;
          if (x < 0.25) advance(-1);
          else if (x > 0.75) advance(1);
          else setPlaying((v) => !v);
        }}
      >
        {zoomed ? (
          <div className="flex min-h-full min-w-full items-start justify-center gap-2 p-4">
            {pagesShown.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p}
                src={pageUrl(issue.slug, p, "read")}
                alt={`Page ${p}`}
                className="max-w-none"
                style={{ width: manifest.sizes.read }}
                onClick={() => setZoomed(false)}
                draggable={false}
              />
            ))}
          </div>
        ) : (
          <div
            key={pagesShown.join("-")}
            className={`flex h-full w-full items-center justify-center gap-1 animate-fade-up ${drift && playing ? "reader-drift" : ""}`}
            style={{ animationDuration: "420ms" }}
          >
            {pagesShown.map((p, i) => {
              const m = manifest.pageList[p - 1];
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p}
                  src={pageUrl(issue.slug, p, "read")}
                  alt={`Page ${p} of ${total}`}
                  width={m.w}
                  height={m.h}
                  decoding="async"
                  draggable={false}
                  className={`h-auto max-h-full w-auto object-contain shadow-[0_30px_80px_-10px_rgba(0,0,0,0.85)] ${
                    pagesShown.length === 1
                      ? "max-w-full rounded-sm"
                      : i === 0
                        ? "max-w-[calc(50%-2px)] rounded-l-sm"
                        : "max-w-[calc(50%-2px)] rounded-r-sm"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- top bar ---------- */}
      <header
        className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 bg-gradient-to-b from-ink/90 to-transparent px-4 py-3 transition-opacity duration-300 sm:px-6 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <Link
          href={`/issue/${issue.slug}`}
          className="flex items-center gap-3 rounded-full py-1 pr-3 text-sm transition hover:bg-paper/5"
        >
          <span className="grid size-8 place-items-center rounded-full bg-paper/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5m6-6l-6 6 6 6" />
            </svg>
          </span>
          <span>
            <span className="font-display font-semibold">#{issue.number}</span>
            <span className="ml-2 text-paper-dim">{issue.date}</span>
          </span>
        </Link>

        <p className="hidden font-mono text-xs uppercase tracking-[0.2em] text-paper-dim sm:block">
          {pagesShown.length === 2 ? `${pagesShown[0]}–${pagesShown[1]}` : page} / {total}
        </p>

        <div className="flex items-center gap-1">
          <IconButton label={spread ? "Single page (S)" : "Two-page spread (S)"} onClick={() => setSpread((v) => !v)} active={spread} className="hidden lg:grid">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="8" height="14" rx="1" />
              <rect x="13" y="5" width="8" height="14" rx="1" />
            </svg>
          </IconButton>
          <IconButton label={zoomed ? "Fit to screen (Z)" : "Zoom (Z)"} onClick={() => setZoomed((v) => !v)} active={zoomed}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4-4M8.5 11h5M11 8.5v5" />
            </svg>
          </IconButton>
          <IconButton label={drift ? "Disable slow drift" : "Slow drift while playing"} onClick={() => setDrift((v) => !v)} active={drift}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 14c3-6 7-6 10 0s7 6 6 0" />
            </svg>
          </IconButton>
          <IconButton label="Fullscreen (F)" onClick={toggleFullscreen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </IconButton>
        </div>
      </header>

      {/* ---------- transport ---------- */}
      <footer
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink via-ink/85 to-transparent pt-12 transition-opacity duration-300 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onMouseEnter={poke}
      >
        {/* filmstrip */}
        <div
          ref={filmstripRef}
          className={`mask-fade-x flex gap-1.5 overflow-x-auto px-6 pb-3 transition-all duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${scrubbing || !playing ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}
        >
          {manifest.pageList.map((p) => (
            <button
              key={p.n}
              type="button"
              data-page={p.n}
              onClick={() => goTo(p.n)}
              className={`relative shrink-0 overflow-hidden rounded-sm border transition ${
                pagesShown.includes(p.n)
                  ? "border-amber ring-2 ring-amber/40"
                  : "border-paper/10 opacity-70 hover:opacity-100"
              }`}
              style={{ height: 64, aspectRatio: `${p.w}/${p.h}`, backgroundColor: p.color }}
              aria-label={`Go to page ${p.n}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pageUrl(issue.slug, p.n, "thumb")} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 pb-4 sm:gap-4 sm:px-6">
          {/* play with countdown ring */}
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            aria-label={playing ? "Pause" : "Play"}
            className="relative grid size-12 shrink-0 place-items-center rounded-full bg-amber text-ink transition hover:bg-amber-2"
          >
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden>
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(6,8,15,0.18)" strokeWidth="3" />
              <circle
                cx="20"
                cy="20"
                r="17"
                fill="none"
                stroke="#06080f"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - (playing ? elapsed : 0))}
              />
            </svg>
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7 4v16l13-8z" />
              </svg>
            )}
          </button>

          <button type="button" onClick={() => advance(-1)} aria-label="Previous page" className="grid size-9 place-items-center rounded-full text-paper-dim transition hover:bg-paper/10 hover:text-paper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>

          {/* scrubber */}
          <div className="relative flex-1">
            <input
              type="range"
              min={1}
              max={total}
              step={1}
              value={page}
              onPointerDown={() => setScrubbing(true)}
              onPointerUp={() => setScrubbing(false)}
              onChange={(e) => goTo(Number(e.target.value))}
              aria-label="Page"
              className="reader-range w-full"
              style={{ ["--pct" as string]: `${pct}%` }}
            />
          </div>

          <button type="button" onClick={() => advance(1)} aria-label="Next page" className="grid size-9 place-items-center rounded-full text-paper-dim transition hover:bg-paper/10 hover:text-paper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <p className="hidden w-20 shrink-0 text-right font-mono text-xs tabular-nums text-paper-dim sm:block">
            {page} / {total}
          </p>

          {/* speed */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSpeedOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 px-3 py-1.5 font-mono text-xs tabular-nums transition hover:border-paper/40"
              aria-haspopup="menu"
              aria-expanded={speedOpen}
            >
              {speed}s<span className="hidden sm:inline"> / page</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
            {speedOpen && (
              <div className="glass absolute bottom-full right-0 mb-2 w-60 rounded-2xl p-3 shadow-2xl">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper-dim">
                  Seconds per page
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`rounded-lg py-1.5 text-sm transition ${
                        s === speed ? "bg-amber text-ink" : "bg-paper/5 hover:bg-paper/10"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={0.5}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="mt-3 w-full accent-amber"
                  aria-label="Custom speed"
                />
                <p className="mt-2 text-[11px] text-paper-dim">
                  ↑ / ↓ keys nudge the speed. Any manual action pauses playback.
                </p>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* end card */}
      {page >= total && !playing && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center">
          <div className="glass pointer-events-auto rounded-2xl px-5 py-3 text-sm">
            End of issue.{" "}
            <Link href={`/issue/${issue.slug}`} className="text-amber hover:text-amber-2">
              Back to #{issue.number}
            </Link>{" "}
            ·{" "}
            <Link href="/catalog" className="text-amber hover:text-amber-2">
              Catalog
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  active,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid size-9 place-items-center rounded-full transition hover:bg-paper/10 [&>svg]:size-[18px] ${
        active ? "text-amber" : "text-paper-dim hover:text-paper"
      } ${className}`}
    >
      {children}
    </button>
  );
}
