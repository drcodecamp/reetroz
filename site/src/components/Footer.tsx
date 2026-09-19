import Link from "next/link";
import { featuredPublications, siteStats } from "@/lib/catalog";
import { magazinePath, SITE_NAME } from "@/lib/seo";

export function Footer() {
  const stats = siteStats();
  const titles = featuredPublications(6);
  return (
    <footer className="relative overflow-hidden border-t border-paper/8">
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_120%,rgba(245,181,63,0.12),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
              Free to read, forever
            </p>
            <p className="mt-4 font-display text-[clamp(2.4rem,6vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
              Pick a year.
              <br />
              <span className="gradient-text">Lose an afternoon.</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="card-shine inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3 font-semibold text-ink transition hover:bg-amber-2"
              >
                Browse the archive
              </Link>
              <Link
                href="/#eras"
                className="inline-flex items-center rounded-full border border-paper/20 px-6 py-3 font-medium transition hover:border-paper/50"
              >
                Jump to an era
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
                Explore
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  ["Catalog", "/catalog"],
                  ["Nintendo Power", magazinePath("nintendo-power")],
                  ["EGM", magazinePath("electronic-gaming-monthly")],
                  ["GamePro", magazinePath("gamepro")],
                  ["Reader", "/#reader"],
                  ["Eras", "/#eras"],
                ].map(([l, href]) => (
                  <li key={l}>
                    <Link href={href} className="text-paper-dim transition hover:text-paper">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
                Credits
              </p>
              <p className="mt-4 text-sm leading-relaxed text-paper-dim">
                Scans and catalogs come from the Video Game History Foundation,
                Internet Archive, CGW Museum and community scanners. Magazines
                remain trademarks of their owners. This is a fan archive —{" "}
                {titles.length > 0 ? (
                  <>
                    start with{" "}
                    <Link
                      href={magazinePath(titles[0].id)}
                      className="text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-amber"
                    >
                      {titles[0].title}
                    </Link>
                    .
                  </>
                ) : (
                  "open a title and read in the browser."
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="hairline mt-20" />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim/70">
          <p>
            {SITE_NAME} · {stats.titles} magazines · {stats.issues.toLocaleString()} issues
          </p>
          <p>Made with care, late at night, in front of a CRT.</p>
        </div>
      </div>
    </footer>
  );
}
