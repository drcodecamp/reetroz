import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { byNumber } from "@/data/issues";

const picks = [
  { n: "1.1", why: "Where it all began — 40 pages, Nov 1981." },
  { n: "39", why: "The game-design issue. Infocom profiled." },
  { n: "100", why: "The collector's edition with the emperor cover." },
  { n: "128", why: "Peak 1995: Descent, Dark Forces, Full Throttle." },
  { n: "162", why: "Jan 1998 — StarCraft and Quake II land." },
  { n: "186", why: "New millennium, new design." },
  { n: "223", why: "Splinter Cell hands-on, Feb 2003." },
  { n: "268", why: "The final issue. 25 years of CGW." },
];

export function StaffPicks() {
  return (
    <section id="picks" className="relative scroll-mt-24 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
              Start here
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-5xl">
              Eight issues worth
              <br />
              an evening each.
            </h2>
          </div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-5 py-2 text-sm text-paper transition hover:border-paper/40"
          >
            View the catalog
          </Link>
        </div>
      </div>

      <div className="mask-fade-x mt-12 overflow-x-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="mx-auto flex w-max gap-5 px-[max(1rem,calc((100vw-80rem)/2+1.5rem))]">
          {picks.map((p) => {
            const it = byNumber(p.n);
            return (
              <li key={p.n} className="w-[210px] shrink-0 sm:w-[240px]">
                <Link href={`/issue/cgw-${it.number.replace(".", "-")}`} className="group block">
                  <div
                    className="cover-3d relative overflow-hidden rounded-lg"
                    style={{ aspectRatio: `${it.w}/${it.h}` }}
                  >
                    <CoverImage
                      src={it.cover}
                      alt={`Cover of Computer Gaming World issue ${it.number}`}
                      fill
                      sizes="240px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/90 via-ink/10 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-ink">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M7 4v16l13-8z" />
                        </svg>
                        Read now
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <p className="font-display text-lg font-semibold tracking-tight">
                      #{it.number}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper-dim">
                      {it.date} · {it.pages}p
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-paper-dim">{p.why}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
