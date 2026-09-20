import Image from "next/image";
import Link from "next/link";
import { siteStats } from "@/lib/catalog";
import { communityChannels } from "@/lib/community";

function formatStat(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k+`;
  return String(n);
}

export function Hero() {
  const stats = siteStats();
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
            Browse
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
          {communityChannels()
            .filter((channel) => channel.href)
            .map((channel) => (
              <a
                key={channel.id}
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-5 py-3 font-medium transition hover:border-paper/50"
              >
                {channel.id === "telegram" ? (
                  <svg viewBox="0 0 24 24" className="size-4 text-[#7ad4ff]" fill="currentColor" aria-hidden>
                    <path d="M21.2 3.4 2.7 10.7c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 11-7c.5-.3.9-.1.6.2l-8.9 8.1-.3 4.6c.5 0 .7-.2 1-.6l2.4-2.3 5 3.7c.9.5 1.6.2 1.8-.9l3.3-15.5c.3-1.4-.5-2-1.6-1.7z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="size-4 text-[#9aa3ff]" fill="currentColor" aria-hidden>
                    <path d="M19.3 4.7A17.4 17.4 0 0 0 14.9 3l-.4.8a15.6 15.6 0 0 1 4 1.6 16 16 0 0 0-12.9 0A15.6 15.6 0 0 1 9.5 3.8L9.1 3A17.4 17.4 0 0 0 4.7 4.7C1.8 9 .9 13.2 1.2 17.3A17.6 17.6 0 0 0 6.6 20l1.1-1.8a11.3 11.3 0 0 1-1.8-.9l.4-.3a12.7 12.7 0 0 0 11.4 0l.4.3a11.3 11.3 0 0 1-1.8.9L17.4 20a17.6 17.6 0 0 0 5.4-2.7c.4-4.8-.7-8.9-3.5-12.6ZM8.8 14.7c-1 0-1.8-1-1.8-2.1s.8-2.1 1.8-2.1 1.9.9 1.8 2.1-.8 2.1-1.8 2.1Zm6.4 0c-1 0-1.8-1-1.8-2.1s.8-2.1 1.8-2.1 1.9.9 1.8 2.1-.8 2.1-1.8 2.1Z" />
                  </svg>
                )}
                {channel.name}
              </a>
            ))}
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
