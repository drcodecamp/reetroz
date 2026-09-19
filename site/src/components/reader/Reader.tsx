"use client";

import Link from "next/link";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { pageUrl, type CatalogIssue } from "@/lib/catalog";
import type { IssueManifest } from "@/lib/manifest";
import { saveProgress, useMediaQuery, useSpeed } from "@/lib/progress";

const SPEEDS = [2, 3, 5, 8, 12, 20];
const IDLE_MS = 2600;
const CROSSFADE_MS = 1400;

type Props = {
  issue: CatalogIssue;
  manifest: IssueManifest;
  initialPage: number;
  autoplay: boolean;
  embedded?: boolean;
};

export type ReaderHandle = {
  goTo: (page: number) => void;
};

/** Magazine convention: cover alone, then 2–3, 4–5, ... */
function spreadFor(page: number, total: number): number[] {
  if (page <= 1) return [1];
  const start = page % 2 === 0 ? page : page - 1;
  return start + 1 <= total ? [start, start + 1] : [start];
}

export const Reader = forwardRef<ReaderHandle, Props>(function Reader(
  { issue, manifest, initialPage, autoplay, embedded = false },
  ref,
) {
  const total = manifest.pages;
  const clamp = useCallback(
    (p: number) => Math.min(total, Math.max(1, Math.round(p))),
    [total],
  );

  const [page, setPage] = useState(() => clamp(initialPage));
  const [playing, setPlayingRaw] = useState(autoplay);
  const [speed, setSpeed] = useSpeed();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [spreadOn, setSpreadOn] = useState(true);
  const spread = desktop && spreadOn;
  const [zoomed, setZoomed] = useState(false);
  const [drift, setDrift] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);

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
  const shownKeyRef = useRef<string | null>(null);
  const [outgoing, setOutgoing] = useState<number[] | null>(null);
  const [crossfading, setCrossfading] = useState(false);

  // --- derived --------------------------------------------------------------
  const pagesShown = useMemo(
    () => (spread ? spreadFor(page, total) : [page]),
    [spread, page, total],
  );
  const pagesKey = pagesShown.join("-");
  const meta = manifest.pageList[page - 1];
  const ambient = meta?.color ?? "#06080f";

  useEffect(() => {
    if (shownKeyRef.current === null) {
      shownKeyRef.current = pagesKey;
      return;
    }
    if (shownKeyRef.current === pagesKey) return;
    const leaving = shownKeyRef.current.split("-").map(Number);
    shownKeyRef.current = pagesKey;
    setOutgoing(leaving);
    setCrossfading(false);
  }, [pagesKey]);

  const beginCrossfade = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCrossfading(true));
    });
  }, []);

  useEffect(() => {
    if (!outgoing) return;
    const fallback = window.setTimeout(beginCrossfade, 900);
    return () => window.clearTimeout(fallback);
  }, [outgoing, pagesKey, beginCrossfade]);

  useEffect(() => {
    if (!outgoing || !crossfading) return;
    const done = window.setTimeout(() => {
      setOutgoing(null);
      setCrossfading(false);
    }, CROSSFADE_MS);
    return () => window.clearTimeout(done);
  }, [outgoing, crossfading]);

  // --- navigation -------------------------------------------------------------
  const setRing = useCallback((t: number) => {
    const el = ringRef.current;
    if (!el) return;
    el.style.strokeDashoffset = String(2 * Math.PI * 17 * (1 - t));
  }, []);

  const goTo = useCallback(
    (p: number, opts: { keepPlaying?: boolean } = {}) => {
      const next = clamp(p);
      if (next !== page) {
        setOutgoing(pagesShown);
        setCrossfading(false);
      }
      setPage(next);
      setRing(0);
      if (!opts.keepPlaying) setPlaying(false);
    },
    [clamp, setPlaying, page, pagesShown, setRing],
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

  useImperativeHandle(ref, () => ({ goTo: (p) => goTo(p) }), [goTo]);

  // Autoplay waits `speed` seconds on a settled spread, then turns with the
  // same dissolve as the arrow keys. The ring is written on the SVG node so
  // the page layers aren't re-rendered every frame.
  useEffect(() => {
    if (!playing) {
      setRing(0);
      return;
    }
    if (outgoing) return;

    let frame = 0;
    const started = performance.now();
    const duration = Math.round(speed * 1000);
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      setRing(t);
      if (t >= 1) {
        advance(1, { keepPlaying: true });
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, outgoing, speed, advance, setRing]);

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
      img.src = pageUrl(issue.slug, p, "read", manifest.format.read);
    }
  }, [page, total, issue.slug, manifest.format.read]);

  // --- filmstrip follows current page ----------------------------------------
  useEffect(() => {
    const root = filmstripRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (!root || !el) return;
    const left = el.offsetLeft - root.clientWidth / 2 + el.offsetWidth / 2;
    root.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
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
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
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
          if (desktop) setSpreadOn((v) => !v);
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
  }, [advance, goTo, total, zoomed, poke, speed, setSpeed, desktop, setPlaying]);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const pct = ((page - 1) / Math.max(1, total - 1)) * 100;
  const pageLabel = `${pagesShown.length === 2 ? `${pagesShown[0]}–${pagesShown[1]}` : page} / ${total}`;

  return (
    <div
      ref={rootRef}
      onMouseMove={poke}
      onTouchStart={poke}
      className={`relative w-full select-none overflow-hidden bg-ink text-paper ${
        embedded ? "h-full" : "h-[100dvh]"
      } ${uiVisible ? "" : "cursor-none"}`}
      style={{
        background: `radial-gradient(120% 90% at 50% 40%, ${ambient}55 0%, #06080f 70%)`,
        transition: "background 900ms ease",
      }}
    >
      {/* ---------- pages ---------- */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          zoomed
            ? "overflow-auto"
            : uiVisible
              ? embedded
                ? scrubbing || !playing
                  ? "px-1 pt-3 pb-[7.25rem] sm:px-4 sm:pt-4 sm:pb-28"
                  : "px-1 pt-3 pb-[4.25rem] sm:px-4 sm:pt-4 sm:pb-20"
                : scrubbing || !playing
                  ? "px-1 pt-11 pb-[7.25rem] sm:px-6 sm:pt-14 sm:pb-32"
                  : "px-1 pt-11 pb-[4.5rem] sm:px-6 sm:pt-14 sm:pb-24"
              : "p-1"
        }`}
        role="application"
        aria-label="Tap the left side for the previous page, the right side for the next page, or the middle to play"
        onClick={(e) => {
          if (zoomed) return;
          const box = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - box.left) / Math.max(1, box.width);
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
                src={pageUrl(issue.slug, p, "read", manifest.format.read)}
                alt={`Page ${p}`}
                className="max-w-none"
                style={{ width: manifest.pageList[p - 1]?.w }}
                onClick={() => setZoomed(false)}
                draggable={false}
              />
            ))}
          </div>
        ) : (
          <div
            className="relative h-full w-full"
            style={{ ["--reader-fade-ms" as string]: `${CROSSFADE_MS}ms` }}
          >
            {outgoing && (
              <div
                className={`pointer-events-none absolute inset-0 flex items-center justify-center gap-1 ${
                  crossfading ? "reader-fade-out" : ""
                }`}
                aria-hidden
              >
                <Spread
                  pages={outgoing}
                  issue={issue}
                  manifest={manifest}
                  total={total}
                />
              </div>
            )}
            <div
              className={`absolute inset-0 flex items-center justify-center gap-1 ${
                outgoing
                  ? crossfading
                    ? "reader-fade-in"
                    : "reader-fade-hidden"
                  : ""
              }`}
            >
              <div
                key={pagesKey}
                className={`flex h-full w-full items-center justify-center gap-1 ${drift && playing ? "reader-drift" : ""}`}
              >
                <Spread
                  pages={pagesShown}
                  issue={issue}
                  manifest={manifest}
                  total={total}
                  onReady={outgoing ? beginCrossfade : undefined}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {!zoomed && !embedded && (
        <div
          className={`pointer-events-none absolute inset-0 z-10 lg:hidden ${uiVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          aria-hidden
        >
          <div className="absolute inset-y-0 left-0 flex w-[22%] items-center justify-start pl-1">
            <span className="grid size-9 place-items-center rounded-full bg-ink/55 text-paper-dim shadow-lg backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </span>
          </div>
          <div className="absolute inset-y-0 right-0 flex w-[22%] items-center justify-end pr-1">
            <span className="grid size-9 place-items-center rounded-full bg-ink/55 text-paper-dim shadow-lg backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          </div>
          <p className="absolute inset-x-0 top-[4.75rem] text-center font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim">
            Tap the sides to turn the page
          </p>
        </div>
      )}

      {/* ---------- top bar ---------- */}
      {!embedded && (
        <header
          className={`absolute inset-x-0 top-0 z-20 flex items-center bg-gradient-to-b from-ink/90 to-transparent px-3 py-3 transition-opacity duration-300 sm:px-4 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <Link
            href={`/issue/${issue.slug}`}
            className="flex items-center gap-2 rounded-full py-1 pr-3 text-sm transition hover:bg-paper/5"
          >
            <span className="grid size-8 place-items-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </span>
            <span>
              <span className="font-display font-semibold">#{issue.number}</span>
              <span className="ml-2 text-paper-dim">{issue.date}</span>
            </span>
          </Link>
        </header>
      )}

      {/* ---------- transport ---------- */}
      <footer
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink via-ink/85 to-transparent pt-12 transition-opacity duration-300 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onMouseEnter={poke}
      >
        {/* filmstrip — visible while paused or scrubbing */}
        <div
          ref={filmstripRef}
          className={`mask-fade-x flex gap-1.5 overflow-x-auto px-6 pb-3 transition-all duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            scrubbing || !playing
              ? "max-h-24 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          {manifest.pageList.map((p) => (
            <button
              key={p.n}
              type="button"
              data-page={p.n}
              onClick={() => goTo(p.n)}
              className={`relative h-12 shrink-0 overflow-hidden rounded-sm border transition sm:h-16 ${
                pagesShown.includes(p.n)
                  ? "border-amber ring-2 ring-amber/40"
                  : "border-paper/10 opacity-70 hover:opacity-100"
              }`}
              style={{ aspectRatio: `${p.w}/${p.h}`, backgroundColor: p.color }}
              aria-label={`Go to page ${p.n}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pageUrl(issue.slug, p.n, "thumb")} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="px-2 pb-2 sm:px-3 sm:pb-2.5">
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

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center">
              <IconButton
                label={playing ? "Pause" : "Play"}
                onClick={() => setPlaying((v) => !v)}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </IconButton>
              <IconButton label="Next page" onClick={() => advance(1)}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </IconButton>
              <p className="ml-1.5 shrink-0 text-sm tabular-nums text-paper sm:ml-2">
                {pageLabel}
              </p>
            </div>

            <div className="flex items-center">
              {desktop && (
                <IconButton
                  label={spread ? "Two-page spread (S)" : "Single page (S)"}
                  onClick={() => setSpreadOn((v) => !v)}
                  active={spread}
                >
                  {spread ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z" />
                      <path d="M12 6v13" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="6.5" y="3" width="11" height="18" rx="1.5" />
                    </svg>
                  )}
                </IconButton>
              )}
              <div className="relative">
                <IconButton
                  label="Settings"
                  onClick={() => setSpeedOpen((v) => !v)}
                  active={speedOpen}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.65 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.13.22.38.3.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.47.41h4c.24 0 .45-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.46 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.04-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
                  </svg>
                </IconButton>
                {speedOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-paper/10 bg-ink-2 p-3 shadow-2xl">
                    <p className="mb-2 text-xs font-medium text-paper-dim">
                      Seconds per page
                    </p>
                    <div className="grid grid-cols-6 gap-1">
                      {SPEEDS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSpeed(s)}
                          className={`rounded-md py-1.5 text-sm transition ${
                            s === speed ? "bg-paper text-ink" : "bg-paper/5 hover:bg-paper/10"
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
                    <div className="mt-3 grid grid-cols-2 gap-1 border-t border-paper/10 pt-3">
                      <button
                        type="button"
                        onClick={() => setZoomed((v) => !v)}
                        className={`rounded-md px-2 py-1.5 text-xs transition ${
                          zoomed ? "bg-paper text-ink" : "bg-paper/5 hover:bg-paper/10"
                        }`}
                      >
                        Zoom
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrift((v) => !v)}
                        className={`rounded-md px-2 py-1.5 text-xs transition ${
                          drift ? "bg-paper text-ink" : "bg-paper/5 hover:bg-paper/10"
                        }`}
                      >
                        Drift
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <IconButton label="Fullscreen (F)" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </IconButton>
            </div>
          </div>
        </div>
      </footer>

      {/* end card */}
      {page >= total && !playing && !embedded && (
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
});

function Spread({
  pages,
  issue,
  manifest,
  total,
  onReady,
}: {
  pages: number[];
  issue: CatalogIssue;
  manifest: IssueManifest;
  total: number;
  onReady?: () => void;
}) {
  const loaded = useRef(0);
  const notified = useRef(false);

  const mark = useCallback(() => {
    loaded.current += 1;
    if (!notified.current && loaded.current >= pages.length) {
      notified.current = true;
      onReady?.();
    }
  }, [onReady, pages.length]);

  return (
    <>
      {pages.map((p, i) => {
        const m = manifest.pageList[p - 1];
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p}
            src={pageUrl(issue.slug, p, "read", manifest.format.read)}
            alt={onReady ? "" : `Page ${p} of ${total}`}
            width={m.w}
            height={m.h}
            decoding="async"
            draggable={false}
            onLoad={mark}
            onError={mark}
            className={`max-h-full max-w-full object-contain shadow-[0_30px_80px_-10px_rgba(0,0,0,0.85)] ${
              pages.length === 1
                ? "h-full w-full rounded-sm"
                : i === 0
                  ? "h-full w-auto max-w-[calc(50%-2px)] rounded-l-sm"
                  : "h-full w-auto max-w-[calc(50%-2px)] rounded-r-sm"
            }`}
          />
        );
      })}
    </>
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
      className={`grid size-10 place-items-center rounded-full text-paper transition hover:bg-paper/10 [&>svg]:size-6 ${
        active ? "bg-paper/10" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}
