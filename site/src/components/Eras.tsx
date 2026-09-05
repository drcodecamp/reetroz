import Image from "next/image";
import Link from "next/link";
import { byNumber } from "@/data/issues";

const eras = [
  {
    span: "1981 – 1985",
    key: "early",
    title: "The hobbyist years",
    blurb:
      "Forty-page issues numbered by volume, black-and-white interiors, and long, thoughtful reviews of Apple II and Atari wargames. Chris Crawford writes about the future.",
    issue: byNumber("1.1"),
    accent: "from-amber/40",
  },
  {
    span: "1986 – 1992",
    key: "boom",
    title: "Color, growth and #100",
    blurb:
      "Issue 25 drops the volume numbers. The magazine survives the crash, goes glossy, and celebrates its 100th issue with a mock-royal cover in November 1992.",
    issue: byNumber("100"),
    accent: "from-magenta/40",
  },
  {
    span: "1993 – 1999",
    key: "cdrom",
    title: "The Ziff Davis era",
    blurb:
      "Doom, Warcraft, Quake, StarCraft, Half-Life. Monthly issues swell past 300 pages and CGW becomes the paper of record for the golden age of PC gaming.",
    issue: byNumber("162"),
    accent: "from-teal/40",
  },
  {
    span: "2000 – 2006",
    key: "2000s",
    title: "The last print decade",
    blurb:
      "Broadband, MMOs and the console wars. The magazine slims down, sharpens up, and signs off with issue 268 in November 2006 before becoming Games for Windows.",
    issue: byNumber("268"),
    accent: "from-amber-2/40",
  },
];

export function Eras() {
  return (
    <section id="eras" className="relative scroll-mt-24 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-magenta">
              Four eras
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-5xl">
              From 40 pages in 1981
              <br />
              to the end of print in 2006.
            </h2>
          </div>
          <p className="max-w-sm text-paper-dim">
            Pick an era and you get its whole run — every cover in a row,
            every issue one tap away.
          </p>
        </div>

        <ol className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {eras.map((e, i) => (
            <li
              key={e.span}
              className={`group relative flex min-h-[460px] flex-col justify-end overflow-hidden rounded-3xl border border-paper/8 bg-gradient-to-b ${e.accent} to-ink-2 p-6`}
            >
              <div
                className="cover-3d absolute right-5 top-6 w-[48%] overflow-hidden rounded-md"
                style={{ aspectRatio: `${e.issue.w}/${e.issue.h}` }}
              >
                <Image
                  src={e.issue.cover}
                  alt={`Cover of issue ${e.issue.number}`}
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              </div>

              <span className="absolute left-6 top-6 font-display text-7xl font-extrabold leading-none tracking-tighter text-paper/10">
                0{i + 1}
              </span>

              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
                {e.span}
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {e.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-paper-dim">
                {e.blurb}
              </p>
              <Link
                href={`/catalog?era=${e.key}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-paper transition group-hover:text-amber"
              >
                Browse this era
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
