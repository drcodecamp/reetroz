"use client";

import Link from "next/link";
import { useProgress } from "@/lib/progress";

export function ContinueButton({ slug }: { slug: string }) {
  const progress = useProgress()[slug];
  if (!progress || progress.page <= 1) return null;

  const pct = Math.round((progress.page / progress.total) * 100);
  return (
    <Link
      href={`/read/${slug}?p=${progress.page}`}
      className="inline-flex items-center gap-3 rounded-full border border-amber/40 bg-amber/10 px-5 py-3 font-medium text-paper transition hover:bg-amber/20"
    >
      Continue p.{progress.page}
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-paper/15">
        <span className="block h-full bg-amber" style={{ width: `${pct}%` }} />
      </span>
    </Link>
  );
}
