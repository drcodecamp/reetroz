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

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {picks.map((p) => {
            const it = byNumber(p.n);
            return (
              <li key={p.n} className="min-w-0">
                <Link href={`/issue/cgw-${it.number.replace(".", "-")}`} className="group block">
                  <div
                    className="cover-3d relative overflow-hidden rounded-md"
                    style={{ aspectRatio: `${it.w}/${it.h}` }}
                  >
                    <CoverImage
                      src={it.cover}
                      alt={`Cover of Computer Gaming World issue ${it.number}`}
                      fill
                      sizes="(min-width: 1024px) 140px, (min-width: 640px) 22vw, 44vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/90 via-ink/10 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber px-2 py-1 text-[10px] font-semibold text-ink">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M7 4v16l13-8z" />
                        </svg>
                        Read
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 font-display text-sm font-semibold tracking-tight">
                    #{it.number}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-dim">
                    {it.date} · {it.pages}p
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-paper-dim">{p.why}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
