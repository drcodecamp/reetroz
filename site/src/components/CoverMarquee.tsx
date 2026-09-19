import { CoverImage } from "@/components/CoverImage";
import { issues, type Issue } from "@/data/issues";

function Row({
  items,
  reverse = false,
}: {
  items: Issue[];
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="pause-on-hover mask-fade-x overflow-hidden py-3">
      <div
        className={`flex w-max gap-4 ${reverse ? "animate-marquee-rev" : "animate-marquee"}`}
      >
        {doubled.map((it, i) => (
          <figure
            key={`${it.number}-${i}`}
            className="cover-3d group relative w-[150px] shrink-0 overflow-hidden rounded-md bg-ink-3 sm:w-[170px]"
            style={{ aspectRatio: `${it.w} / ${it.h}` }}
          >
            <CoverImage
              src={it.cover}
              alt={`Computer Gaming World issue ${it.number}, ${it.date}`}
              fill
              sizes="170px"
              className="object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink via-ink/85 to-transparent p-3 pt-8 transition group-hover:translate-y-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                #{it.number}
              </p>
              <p className="text-xs text-paper">{it.date}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function CoverMarquee() {
  const half = Math.ceil(issues.length / 2);
  const rowA = issues.slice(0, half);
  const rowB = issues.slice(half);
  return (
    <section
      id="archive"
      className="relative scroll-mt-28 overflow-hidden pb-10 pt-16"
      aria-label="Cover gallery"
    >
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(245,181,63,0.09),transparent)]" />
      <div className="relative -rotate-2 scale-[1.04]">
        <Row items={rowA} />
        <Row items={rowB} reverse />
      </div>
    </section>
  );
}
