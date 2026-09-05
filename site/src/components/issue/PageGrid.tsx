"use client";

import Link from "next/link";
import { useState } from "react";
import { pageUrl } from "@/lib/catalog";
import type { PageMeta } from "@/lib/manifest";

const INITIAL = 36;

export function PageGrid({ slug, pages }: { slug: string; pages: PageMeta[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? pages : pages.slice(0, INITIAL);

  return (
    <>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
        {shown.map((p) => (
          <li key={p.n}>
            <Link
              href={`/read/${slug}?p=${p.n}`}
              className="group block overflow-hidden rounded-md border border-paper/8 bg-ink-3 transition hover:border-amber/50"
              style={{ aspectRatio: `${p.w} / ${p.h}`, backgroundColor: p.color }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageUrl(slug, p.n, "thumb")}
                alt={`Page ${p.n}`}
                loading="lazy"
                decoding="async"
                width={p.w}
                height={p.h}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </Link>
            <p className="mt-1 text-center font-mono text-[10px] text-paper-dim/70">
              {p.n}
            </p>
          </li>
        ))}
      </ul>
      {pages.length > INITIAL && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-paper/15 px-5 py-2 text-sm transition hover:border-paper/40"
        >
          {expanded ? "Show fewer pages" : `Show all ${pages.length} pages`}
        </button>
      )}
    </>
  );
}
