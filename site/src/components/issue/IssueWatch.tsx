"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageGrid } from "@/components/issue/PageGrid";
import { Reader, type ReaderHandle } from "@/components/reader/Reader";
import type { CatalogIssue, CatalogPublication, Era } from "@/lib/catalog";
import type { IssueManifest } from "@/lib/manifest";
import { useProgress } from "@/lib/progress";
import { issueH1, magazinePath } from "@/lib/seo";

type Props = {
  issue: CatalogIssue;
  pubTitle: string;
  pub?: CatalogPublication;
  era: Era;
  description: string;
  manifest: IssueManifest | null;
};

export function IssueWatch({
  issue,
  pubTitle,
  pub,
  era,
  description,
  manifest,
}: Props) {
  const readerRef = useRef<ReaderHandle>(null);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const progress = useProgress();

  useEffect(() => {
    const saved = progress[issue.slug];
    if (saved?.page && saved.page > 1) readerRef.current?.goTo(saved.page);
    // Restore once per issue; later page turns write progress themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue.slug]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={magazinePath(issue.publication)}
          className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-3.5 py-1.5 text-base transition hover:border-paper/40"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Go Back
        </Link>
        <button
          type="button"
          onClick={async () => {
            const url = window.location.href;
            const title = issueH1(pubTitle, issue);
            const text = description;
            try {
              if (navigator.share) {
                await navigator.share({ title, text, url });
                return;
              }
              await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
              setShareLabel("Copied");
              window.setTimeout(() => setShareLabel("Share"), 1600);
            } catch {
              // User cancelled the share sheet, or clipboard is blocked.
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-3.5 py-1.5 text-base transition hover:border-paper/40"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" />
            <path d="M16 6l-4-4-4 4" />
            <path d="M12 2v14" />
          </svg>
          {shareLabel}
        </button>
      </div>
      <div className="overflow-hidden rounded-xl bg-ink-2">
        <div className="relative h-[min(56vh,560px)] w-full sm:h-[min(64vh,760px)] lg:h-[min(78dvh,1080px)]">
          {manifest ? (
            <Reader
              ref={readerRef}
              embedded
              issue={issue}
              manifest={manifest}
              initialPage={1}
              autoplay={false}
            />
          ) : (
            <div className="relative grid h-full place-items-center overflow-hidden">
              <Image
                src={issue.cover}
                alt=""
                fill
                sizes="(min-width: 1024px) 70vw, 100vw"
                className="object-cover opacity-40 blur-2xl"
                aria-hidden
              />
              <div className="relative max-w-md px-6 text-center">
                <div className="relative mx-auto mb-5 aspect-[3/4] w-32 overflow-hidden rounded-lg">
                  <Image
                    src={issue.cover}
                    alt={`Cover of ${pubTitle} issue ${issue.number}`}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
                <p className="text-base text-paper-dim">
                  Online reader coming soon for this issue
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {issueH1(pubTitle, issue)}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-paper-dim">
          <Link
            href={magazinePath(issue.publication)}
            className="font-medium text-paper transition hover:text-amber"
          >
            {pubTitle}
          </Link>
          <span aria-hidden>·</span>
          <span>{issue.date}</span>
          <span aria-hidden>·</span>
          <span>{issue.pages} pages</span>
          {issue.special ? (
            <>
              <span aria-hidden>·</span>
              <span>{issue.special}</span>
            </>
          ) : null}
        </div>

        <div className="mt-4 space-y-3 text-base leading-relaxed text-paper-dim">
          <p>{description}</p>
          {pub && (
            <p>
              {pub.publisher ? `${pub.publisher} · ` : ""}
              {pub.country} · via {pub.provider}
              {" · "}
              <Link
                href={`/catalog?era=${era.key}`}
                className="text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-amber"
              >
                More from {era.label.toLowerCase()}
              </Link>
            </p>
          )}
        </div>

        {manifest && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setPagesOpen((v) => !v)}
              aria-expanded={pagesOpen}
              className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-4 py-2 text-base transition hover:border-paper/40"
            >
              Pages
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${pagesOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {pagesOpen && (
              <div className="mt-4">
                <PageGrid
                  slug={issue.slug}
                  pages={manifest.pageList}
                  onSelectPage={(n) => readerRef.current?.goTo(n)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
