import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { IssueCard } from "@/components/IssueCard";
import { Nav } from "@/components/Nav";
import {
  YEARS,
  catalog,
  compareIssueNumber,
  getPublication,
  isUndated,
  issuesInYear,
  UNDATED_YEAR,
} from "@/lib/catalog";
import { magazinePath } from "@/lib/seo";

type Props = { params: Promise<{ year: string }> };

function parseYear(raw: string): number | null {
  if (raw === "undated") return UNDATED_YEAR;
  const year = Number(raw);
  return Number.isFinite(year) ? year : null;
}

export function generateStaticParams() {
  const years = YEARS.map((year) => ({ year: String(year) }));
  if (catalog.some((issue) => isUndated(issue.year))) years.push({ year: "undated" });
  return years;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year: raw } = await params;
  const year = parseYear(raw);
  if (year == null || issuesInYear(year).length === 0) return {};
  const label = isUndated(year) ? "Undated" : String(year);
  return {
    title: `${label} magazine issues`,
    description: `Every video game magazine issue from ${label} in the Pixel Press archive.`,
  };
}

export default async function YearPage({ params }: Props) {
  const { year: raw } = await params;
  const year = parseYear(raw);
  if (year == null) notFound();

  const issues = [...issuesInYear(year)].sort(compareIssueNumber);
  if (issues.length === 0) notFound();

  const byPub = new Map<string, typeof issues>();
  for (const issue of issues) {
    const list = byPub.get(issue.publication) ?? [];
    list.push(issue);
    byPub.set(issue.publication, list);
  }
  const groups = [...byPub.entries()]
    .map(([id, list]) => ({ pub: getPublication(id), list }))
    .filter((group) => group.pub)
    .sort((a, b) => b.list.length - a.list.length || a.pub!.title.localeCompare(b.pub!.title));

  const label = isUndated(year) ? "Undated" : String(year);

  return (
    <>
      <Nav />
      <main className="pb-24 pt-28">
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
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
              <li className="text-amber">{label}</li>
            </ol>
          </nav>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Year</p>
              <h1 className="mt-3 font-display text-5xl font-extrabold tracking-[-0.03em] sm:text-6xl">
                {label}
              </h1>
              <p className="mt-4 max-w-xl text-paper-dim">
                {issues.length} issue{issues.length === 1 ? "" : "s"} from {groups.length} magazine
                {groups.length === 1 ? "" : "s"}.
              </p>
            </div>
            <Link
              href={`/catalog#y${year}`}
              className="rounded-full border border-paper/20 px-5 py-2.5 text-sm font-medium transition hover:border-paper/50"
            >
              Back to catalog
            </Link>
          </div>

          <div className="mt-14 space-y-14">
            {groups.map(({ pub, list }) => (
              <section key={pub!.id} id={pub!.id}>
                <div className="mb-5 flex flex-wrap items-baseline gap-3">
                  <h2 className="font-display text-2xl font-bold tracking-tight">
                    <Link href={`${magazinePath(pub!.id)}#y${year}`} className="hover:text-amber">
                      {pub!.title}
                    </Link>
                  </h2>
                  <Link
                    href={magazinePath(pub!.id)}
                    className="rounded-full border border-paper/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-amber hover:border-amber"
                  >
                    Show all
                  </Link>
                  <span className="hairline flex-1" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim">
                    {list.length} issue{list.length === 1 ? "" : "s"}
                  </span>
                </div>
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
      </main>
      <Footer />
    </>
  );
}
