import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { catalog, publications, siteStats } from "@/lib/catalog";
import { catalogMetadata } from "@/lib/seo";

export const metadata: Metadata = catalogMetadata();

export default function CatalogPage() {
  const stats = siteStats();
  return (
    <>
      <Nav />
      <main className="pt-32 pb-24">
        <header className="mx-auto mb-12 max-w-7xl px-4 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
            The library
          </p>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-[-0.03em] sm:text-6xl">
            Video game magazine archive
          </h1>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-paper-dim sm:text-3xl">
            {stats.issues.toLocaleString()} issues from {stats.titles} magazines
          </h2>
          <p className="mt-4 max-w-2xl text-paper-dim">
            {stats.pages.toLocaleString()} pages from {stats.titlesWithIssues} of
            the {stats.titles} titles we are tracking
            {stats.readable === stats.issues
              ? ", every one of them readable online."
              : `; ${stats.readable.toLocaleString()} issues are readable online so far.`}{" "}
            Filter by magazine, year or era — or open a title page for a
            complete run.
          </p>
        </header>
        <Suspense fallback={<div className="px-6 text-paper-dim">Loading catalog…</div>}>
          <CatalogBrowser issues={catalog} publications={publications} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
