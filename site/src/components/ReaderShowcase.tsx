import Image from "next/image";
import { byNumber } from "@/data/issues";

const issue = byNumber("100");

export function ReaderShowcase() {
  return (
    <section
      id="reader"
      className="relative scroll-mt-24 overflow-hidden py-24 lg:py-32"
    >
      <Image
        src="/img/texture-halftone.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-70"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/40 to-ink" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10">
        <div className="relative order-2 lg:order-1">
          <div className="animate-float relative">
            <Image
              src="/img/reader-devices.png"
              alt="The Reetroz reader shown on a laptop and a tablet"
              width={1024}
              height={768}
              className="w-full drop-shadow-[0_40px_80px_rgba(0,0,0,0.7)] [mask-image:radial-gradient(ellipse_78%_78%_at_50%_50%,#000_55%,transparent_100%)]"
            />
          </div>

          {/* floating issue chip */}
          <div className="glass absolute -bottom-4 left-4 flex items-center gap-3 rounded-xl p-3 pr-5 shadow-2xl sm:left-10">
            <div
              className="relative w-10 overflow-hidden rounded"
              style={{ aspectRatio: `${issue.w}/${issue.h}` }}
            >
              <Image
                src={issue.cover}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="leading-tight">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                Now reading
              </p>
              <p className="text-sm font-medium">
                Issue #{issue.number} · {issue.date}
              </p>
              <p className="text-xs text-paper-dim">
                page 41 of {issue.pages}
              </p>
            </div>
            <span className="ml-3 h-1.5 w-20 overflow-hidden rounded-full bg-paper/10">
              <span className="block h-full w-[42%] rounded-full bg-amber" />
            </span>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
            The reader
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-5xl">
            Built for the couch,
            <br />
            the train and the 4K monitor.
          </h2>
          <p className="mt-6 max-w-lg text-paper-dim">
            Pages are pre-rendered at multiple sizes and served from the edge,
            so turning a page feels like turning a page. Your place is saved
            per issue. Keyboard, swipe and scroll all work.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ["Instant open", "No 60 MB wait — the first spread streams in under a second."],
              ["Spread view", "Two facing pages on wide screens, exactly as printed."],
              ["Deep zoom", "Read the fine print on every ad and screenshot."],
              ["Remembers you", "Pick up where you left off, on any device."],
            ].map(([t, d]) => (
              <li
                key={t}
                className="rounded-xl border border-paper/8 bg-ink/50 p-4 backdrop-blur"
              >
                <p className="font-display font-semibold">{t}</p>
                <p className="mt-1 text-sm text-paper-dim">{d}</p>
              </li>
            ))}
          </ul>

          <a
            href="#picks"
            className="mt-9 inline-flex items-center gap-2 font-medium text-amber transition hover:text-amber-2"
          >
            See what to read first
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
