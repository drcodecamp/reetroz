import Image from "next/image";
import Link from "next/link";
import { featuredPublications, publicationCover } from "@/lib/catalog";
import { magazinePath, yearSpan } from "@/lib/seo";

export function FeaturedMagazines() {
  const titles = featuredPublications(8);
  if (titles.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
            Start with a title
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-5xl">
            Nintendo Power, EGM, GamePro
            <br />
            and the rest of the rack.
          </h2>
        </div>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-sm font-medium text-amber hover:text-amber-2"
        >
          Browse every magazine
          <span aria-hidden>→</span>
        </Link>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {titles.map((pub) => {
          const cover = publicationCover(pub);
          const years = yearSpan(pub);
          return (
            <li key={pub.id}>
              <Link
                href={magazinePath(pub.id)}
                className="group flex gap-4 rounded-2xl border border-paper/8 bg-ink-2/60 p-4 transition hover:border-amber/30"
              >
                {cover && (
                  <span className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block font-display text-lg font-semibold tracking-tight group-hover:text-amber">
                    {pub.title}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim">
                    {years ?? "archive"} · {pub.issues} issues
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
