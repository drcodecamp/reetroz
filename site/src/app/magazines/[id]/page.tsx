import type { Metadata } from "next";
import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { IssueCard } from "@/components/IssueCard";
import { Nav } from "@/components/Nav";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getPublication,
  indexablePublications,
  isUndated,
  issuesForPublication,
  publicationCover,
  relatedPublications,
} from "@/lib/catalog";
import {
  breadcrumbJsonLd,
  countryName,
  magazinePath,
  platformLabel,
  publicationBlurb,
  publicationH1,
  publicationJsonLd,
  publicationMetadata,
  typeLabel,
  yearSpan,
} from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return indexablePublications().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pub = getPublication(id);
  if (!pub || pub.issues === 0) return {};
  return publicationMetadata(pub, publicationCover(pub));
}

export default async function MagazinePage({ params }: Props) {
  const { id } = await params;
  const pub = getPublication(id);
  if (!pub || pub.issues === 0) notFound();

  const issues = issuesForPublication(pub.id);
  const cover = publicationCover(pub);
  const related = relatedPublications(pub);
  const years = yearSpan(pub);
  const first = issues[0];
  const last = issues[issues.length - 1];

  const byYear = new Map<number, typeof issues>();
  for (const issue of issues) {
    const list = byYear.get(issue.year) ?? [];
    list.push(issue);
    byYear.set(issue.year, list);
  }
  const yearRows = [...byYear.entries()].sort((a, b) => {
    const aU = isUndated(a[0]);
    const bU = isUndated(b[0]);
    if (aU !== bU) return aU ? 1 : -1;
    return a[0] - b[0];
  });

  const platforms = pub.platforms
    .filter((p) => p !== "other")
    .map(platformLabel);

  return (
    <>
      <JsonLd data={publicationJsonLd(pub, cover)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Catalog", path: "/catalog" },
          { name: pub.title, path: magazinePath(pub.id) },
        ])}
      />
      <Nav />
      <main className="pb-24 pt-20">
        <section className="relative overflow-hidden">
          {cover && (
            <div className="absolute inset-0 -z-10">
              <CoverImage
                src={cover}
                alt=""
                fill
                sizes="100vw"
                className="scale-110 object-cover opacity-30 blur-3xl saturate-150"
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/80 to-ink" />
            </div>
          )}

          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
            <nav aria-label="Breadcrumb" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-paper">
                    Home
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href="/catalog" className="hover:text-paper">
                    Catalog
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-amber">{pub.short}</li>
              </ol>
            </nav>

            <div className="mt-8 grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-14">
              {cover && (
                <div className="cover-3d relative mx-auto aspect-[3/4] w-[220px] overflow-hidden rounded-xl lg:mx-0 lg:w-full">
                  <CoverImage
                    src={cover}
                    alt={`Cover of ${pub.title}`}
                    fill
                    priority
                    sizes="280px"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="flex flex-col justify-center">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
                  {typeLabel(pub.type)}
                  {years ? ` · ${years}` : ""}
                  {` · ${countryName(pub.country)}`}
                </p>
                <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                  {publicationH1(pub)}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-paper-dim">
                  {publicationBlurb(pub)}
                </p>

                <dl className="mt-8 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
                  {[
                    [pub.issues.toLocaleString(), "issues"],
                    [pub.pages.toLocaleString(), "pages"],
                    [pub.readable.toLocaleString(), "readable"],
                    [platforms[0] ?? pub.country, platforms[0] ? "platform" : "country"],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
                        {label}
                      </dt>
                      <dd className="mt-1 font-display text-2xl font-bold tracking-tight">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {first?.readable && (
                    <Link
                      href={`/issue/${first.slug}`}
                      className="card-shine inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3 font-semibold text-ink transition hover:bg-amber-2"
                    >
                      Open issue #{first.number}
                    </Link>
                  )}
                  <Link
                    href={`/catalog?pub=${pub.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-5 py-3 font-medium transition hover:border-paper/50"
                  >
                    Filter in catalog
                  </Link>
                </div>

                {pub.publisher && (
                  <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim">
                    {pub.publisher}
                    {pub.short !== pub.title ? ` · also searched as ${pub.short}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Issues
              </h2>
              <p className="mt-2 max-w-xl text-paper-dim">
                {first && last
                  ? `From ${first.date} through ${last.date}. Tap a cover to open the issue.`
                  : "Every ingested issue of this title."}
              </p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim">
              {issues.length} {issues.length === 1 ? "issue" : "issues"}
            </p>
          </div>

          <div className="space-y-14">
            {yearRows.map(([year, list]) => (
              <section key={year} id={`y${year}`}>
                <h3 className="mb-5 font-display text-2xl font-bold tracking-tight">
                  {isUndated(year) ? "Undated" : year}
                  <span className="ml-3 font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-paper-dim">
                    {list.length} {list.length === 1 ? "issue" : "issues"}
                  </span>
                </h3>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                  {list.map((issue) => (
                    <li key={issue.id}>
                      <IssueCard issue={issue} publication={pub} sizes="(max-width: 640px) 45vw, 180px" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Also in the library
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((other) => (
                <li key={other.id}>
                  <Link
                    href={magazinePath(other.id)}
                    className="block rounded-2xl border border-paper/8 bg-ink-2/60 p-4 transition hover:border-paper/25"
                  >
                    <p className="font-display text-lg font-semibold tracking-tight">
                      {other.title}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim">
                      {yearSpan(other) ?? "archive"} · {other.issues} issues
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
