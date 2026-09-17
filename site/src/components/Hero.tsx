import Image from "next/image";
import Link from "next/link";
import { siteStats, startReadingIssue } from "@/lib/catalog";

function formatStat(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k+`;
  return String(n);
}

export function Hero() {
  const stats = siteStats();
  const start = startReadingIssue();
  const heroStats = [
    { value: stats.issues.toLocaleString(), label: "issues" },
    { value: String(stats.titles), label: "magazines" },
    { value: formatStat(stats.pages), label: "pages" },
    { value: "0", label: "downloads needed" },
  ];
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden">
      <Image
        src="/img/hero-desk.png"
        alt="A late-night desk with a CRT monitor, a joystick and a stack of vintage gaming magazines"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[70%_center] animate-flicker"
      />
      {/* Layered gradients so the copy stays readable on any screen size */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
      <div className="scanlines absolute inset-0" aria-hidden />

      {/* moving CRT beam */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan bg-gradient-to-b from-transparent via-teal/10 to-transparent"
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-4 pb-20 pt-32 sm:px-6 lg:justify-center lg:pb-32">
        <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.3em] text-amber">
          {stats.titles} magazines · {stats.issues.toLocaleString()} issues · 0 downloads
        </p>

        <h1
          className="animate-fade-up mt-5 max-w-4xl font-display text-[clamp(2.6rem,7.5vw,6.2rem)] font-extrabold leading-[0.95] tracking-[-0.03em]"
          style={{ animationDelay: "80ms" }}
        >
          Vintage game magazines,
          <br />
          readable in the browser.
        </h1>

        <p
          className="animate-fade-up mt-7 max-w-xl text-lg leading-relaxed text-paper-dim"
          style={{ animationDelay: "160ms" }}
        >
          Nintendo Power, EGM, GamePro and a hundred other out-of-print titles,
          scanned page by page. Flip through covers like a streaming library,
          open any issue instantly, and never download a PDF again.
        </p>

        <div
          className="animate-fade-up mt-10 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "240ms" }}
        >
          <Link
            href="/catalog"
            className="card-shine inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3 font-semibold text-ink transition hover:bg-amber-2"
          >
            Browse the archive
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link
            href={start ? `/issue/${start.slug}` : "/catalog"}
            className="inline-flex items-center gap-2 rounded-full border border-paper/20 bg-ink/40 px-6 py-3 font-medium text-paper backdrop-blur transition hover:border-paper/50"
          >
            <span className="grid size-5 place-items-center rounded-full bg-paper/10">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M7 4v16l13-8z" />
              </svg>
            </span>
            {start
              ? `Open ${start.publication === "nintendo-power" ? "Nintendo Power" : "issue"} #${start.number}`
              : "Browse the catalog"}
          </Link>
        </div>

        <dl
          className="animate-fade-up mt-16 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 border-t border-paper/10 pt-8 sm:grid-cols-4"
          style={{ animationDelay: "320ms" }}
        >
          {heroStats.map((s) => (
            <div key={s.label}>
              <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
                {s.label}
              </dt>
              <dd className="mt-1 font-display text-3xl font-bold tracking-tight text-paper">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center lg:flex">
        <div className="flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper-dim/70">
          scroll
          <span className="block h-10 w-px bg-gradient-to-b from-paper/60 to-transparent" />
        </div>
      </div>
    </section>
  );
}
