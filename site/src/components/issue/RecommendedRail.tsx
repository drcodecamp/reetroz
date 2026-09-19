import Image from "next/image";
import Link from "next/link";
import type { CatalogIssue, CatalogPublication } from "@/lib/catalog";
import { getPublication, isUndated } from "@/lib/catalog";
import { issuePath, magazinePath } from "@/lib/seo";

export function RecommendedRail({ issues }: { issues: CatalogIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <aside>
      <h2 className="text-sm font-semibold">Up next</h2>
      <ul className="mt-3 space-y-3">
        {issues.map((issue) => (
          <RecommendedCard
            key={issue.slug}
            issue={issue}
            publication={getPublication(issue.publication)}
          />
        ))}
      </ul>
    </aside>
  );
}

function RecommendedCard({
  issue,
  publication,
}: {
  issue: CatalogIssue;
  publication?: CatalogPublication;
}) {
  const title = publication?.title ?? issue.publication;
  const yearLabel = isUndated(issue.year) ? "Undated" : String(issue.year);

  return (
    <li>
      <Link href={issuePath(issue.slug)} className="group flex gap-3">
        <div className="relative aspect-[3/4] w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-ink-3">
          <Image
            src={issue.cover}
            alt=""
            fill
            sizes="72px"
            className="object-cover transition group-hover:scale-105"
          />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-amber">
            {`${title} #${issue.number}`}
          </p>
          <p className="mt-0.5 text-xs text-paper-dim">
            {yearLabel}
            {issue.readable ? ` · ${issue.pages} pages` : ""}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function RecommendedRailFooter({
  publicationId,
  year,
}: {
  publicationId: string;
  year: number;
}) {
  return (
    <p className="mt-4 text-sm">
      <Link href={magazinePath(publicationId)} className="text-amber hover:text-amber-2">
        More from this magazine
      </Link>
      {!isUndated(year) && (
        <>
          {" · "}
          <Link href={`/catalog?from=${year}&to=${year}`} className="text-amber hover:text-amber-2">
            All of {year}
          </Link>
        </>
      )}
    </p>
  );
}
