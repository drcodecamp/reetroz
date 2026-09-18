import Image from "next/image";
import Link from "next/link";
import type { CatalogIssue, CatalogPublication } from "@/lib/catalogMeta";

type Props = {
  issue: CatalogIssue;
  publication?: CatalogPublication;
  progress?: { page: number; total: number };
  sizes?: string;
  priority?: boolean;
};

export function IssueCard({ issue, publication, progress, sizes = "220px", priority }: Props) {
  const pct = progress ? Math.round((progress.page / progress.total) * 100) : 0;
  const pub = publication;
  return (
    <Link href={`/issue/${issue.slug}`} className="group block">
      <div className="cover-3d relative aspect-[3/4] overflow-hidden rounded-lg bg-ink-3">
        <Image
          src={issue.cover}
          alt={`Cover of ${pub?.title ?? issue.publication} issue ${issue.number}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
        {issue.readable && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-ink shadow">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 4v16l13-8z" />
            </svg>
            Read online
          </span>
        )}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/90 via-ink/10 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-ink">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 4v16l13-8z" />
            </svg>
            {progress ? `Continue p.${progress.page}` : issue.readable ? "Play" : "Details"}
          </span>
        </div>
        {progress && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-paper/15">
            <span className="block h-full bg-amber" style={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <p className="font-display text-base font-semibold leading-tight tracking-tight">
          <span className="text-paper-dim">{pub?.short ?? issue.publication}</span> #{issue.number}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-dim">
          {issue.date} · {issue.pages} pages
        </p>
      </div>
    </Link>
  );
}
