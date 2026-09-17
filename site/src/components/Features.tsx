const features = [
  {
    eyebrow: "01 — Browse",
    title: "A library, not a file list.",
    body: "Covers laid out by year in rows you can scrub through. Hover any issue for the date, page count and headline stories — the way you'd pick a film, not a PDF.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="10" y="4" width="5" height="16" rx="1" />
        <path d="M17 5l4 1-3 14-4-1z" />
      </svg>
    ),
  },
  {
    eyebrow: "02 — Read",
    title: "Opens in a second. Reads like paper.",
    body: "Pages stream in as you turn them, so a 90 MB issue opens instantly. Two-page spreads on desktop, single pages on your phone, pinch-zoom on every screenshot.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z" />
        <path d="M12 6v13" />
      </svg>
    ),
  },
  {
    eyebrow: "03 — Search",
    title: "Find the review, not the issue.",
    body: "Every page is OCR'd. Type a game, a studio or a designer and jump straight to the page it appears on — across every magazine in the library.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-4-4" />
        <path d="M8.5 11h5M11 8.5v5" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-teal">
            Why this exists
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-5xl">
            Thousands of pages of gaming history were locked in{" "}
            <span className="text-outline">giant PDFs.</span>
          </h2>
          <p className="mt-6 max-w-md text-paper-dim">
            The scans are wonderful. The experience wasn&apos;t: download 60 MB,
            wait, open a viewer, squint. We rebuilt the whole archive as a
            site you can actually wander through.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-1">
          {features.map((f) => (
            <li
              key={f.eyebrow}
              className="group relative grid gap-5 rounded-2xl border border-paper/8 bg-ink-2/60 p-6 transition hover:border-amber/30 hover:bg-ink-3/70 sm:grid-cols-[auto_1fr] sm:p-7"
            >
              <span className="grid size-12 place-items-center rounded-xl border border-paper/10 bg-ink text-amber transition group-hover:border-amber/40 [&>svg]:size-6">
                {f.icon}
              </span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
                  {f.eyebrow}
                </p>
                <h3 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2 text-paper-dim">{f.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
