import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { IssueCard } from "@/components/IssueCard";
import { Nav } from "@/components/Nav";
import { ContinueButton } from "@/components/issue/ContinueButton";
import { PageGrid } from "@/components/issue/PageGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { eraOf, getIssue, getPublication, issuesInYear, neighbors } from "@/lib/catalog";
import { loadManifest } from "@/lib/manifest";
import {
  breadcrumbJsonLd,
  issueH1,
  issueJsonLd,
  issueMetadata,
  magazinePath,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return {};
  const pub = getPublication(issue.publication);
  const title = pub?.title ?? issue.publication;
  return issueMetadata(title, issue);
}

export default async function IssuePage({ params }: Props) {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) notFound();

  const manifest = await loadManifest(issue.slug);
  const pub = getPublication(issue.publication);
  const pubTitle = pub?.title ?? issue.publication;
  const era = eraOf(issue.era);
  const { prev, next } = neighbors(issue);
  const sameYear = issuesInYear(issue.year).filter((i) => i.slug !== issue.slug);

  return (
    <>
      {pub && (
        <>
          <JsonLd data={issueJsonLd(pub, issue)} />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: pub.title, path: magazinePath(pub.id) },
              { name: `Issue ${issue.number}`, path: `/issue/${issue.slug}` },
            ])}
          />
        </>
      )}
      <Nav />
      <main className="pb-24 pt-20">
        {/* Title block */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <Image
              src={issue.cover}
              alt=""
              fill
              sizes="100vw"
              className="scale-110 object-cover opacity-30 blur-3xl saturate-150"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/80 to-ink" />
          </div>

          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[320px_1fr] lg:gap-14 lg:py-16">
            <div className="cover-3d relative mx-auto aspect-[3/4] w-[240px] overflow-hidden rounded-xl lg:mx-0 lg:w-full">
              <Image
                src={issue.cover}
                alt={`Cover of ${pubTitle} issue ${issue.number}`}
                fill
                priority
                sizes="320px"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col justify-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
                <Link href={magazinePath(issue.publication)} className="hover:text-paper">
                  {pubTitle}
                </Link>
                {" · "}
                {issue.pages} pages
                {issue.special ? ` · ${issue.special}` : ""}
              </p>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
                {issueH1(pubTitle, issue)}
              </h1>
              {pub && (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim">
                  {pub.publisher ? `${pub.publisher} · ` : ""}{pub.country} · via {pub.provider}
                </p>
              )}
              <p className="mt-5 max-w-xl text-paper-dim">
                {era.blurb}{" "}
                <Link
                  href={`/catalog?era=${era.key}`}
                  className="text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-amber"
                >
                  More from {era.label.toLowerCase()} →
                </Link>
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {issue.readable ? (
                  <>
                    <Link
                      href={`/read/${issue.slug}?p=1&play=1`}
                      className="card-shine inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3 font-semibold text-ink transition hover:bg-amber-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M7 4v16l13-8z" />
                      </svg>
                      Play from start
                    </Link>
                    <ContinueButton slug={issue.slug} />
                    <Link
                      href={`/read/${issue.slug}?p=1`}
                      className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-5 py-3 font-medium transition hover:border-paper/50"
                    >
                      Read at my pace
                    </Link>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-paper/25 px-5 py-3 text-sm text-paper-dim">
                    Online reader coming soon for this issue
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Pages */}
        {manifest && (
          <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Pages
              </h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim">
                Tap any page to open the reader there
              </p>
            </div>
            <PageGrid slug={issue.slug} pages={manifest.pageList} />
          </section>
        )}

        {/* Prev / next */}
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
          <h2 className="mb-5 font-display text-2xl font-bold tracking-tight">
            Previous and next issues
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/issue/${prev.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-paper/8 bg-ink-2/60 p-4 transition hover:border-paper/25"
              >
                <div className="relative aspect-[3/4] w-14 overflow-hidden rounded">
                  <Image src={prev.cover} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper-dim">
                    ← Previous
                  </p>
                  <p className="font-display font-semibold">
                    #{prev.number} · {prev.date}
                  </p>
                </div>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/issue/${next.slug}`}
                className="group flex items-center justify-end gap-4 rounded-2xl border border-paper/8 bg-ink-2/60 p-4 text-right transition hover:border-paper/25"
              >
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper-dim">
                    Next →
                  </p>
                  <p className="font-display font-semibold">
                    #{next.number} · {next.date}
                  </p>
                </div>
                <div className="relative aspect-[3/4] w-14 overflow-hidden rounded">
                  <Image src={next.cover} alt="" fill sizes="56px" className="object-cover" />
                </div>
              </Link>
            )}
          </div>
        </section>

        {/* Same year */}
        {sameYear.length > 0 && (
          <section className="mt-20">
            <div className="mx-auto mb-5 flex max-w-7xl items-baseline justify-between px-4 sm:px-6">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                More from {issue.year}
              </h2>
              <Link
                href={`/catalog?from=${issue.year}&to=${issue.year}&view=grid`}
                className="text-sm text-amber hover:text-amber-2"
              >
                All of {issue.year} →
              </Link>
            </div>
            <ul className="mask-fade-x flex gap-4 overflow-x-auto px-[max(1rem,calc((100vw-80rem)/2+1.5rem))] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sameYear.map((i) => (
                <li key={i.slug} className="w-[160px] shrink-0">
                  <IssueCard issue={i} publication={getPublication(i.publication)} sizes="160px" />
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
