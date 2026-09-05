import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { catalog, publications } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Catalog | Pixel Press",
  description:
    "Browse classic video game and computer magazines by title, year, era and length.",
};

export default function CatalogPage() {
  const readable = catalog.filter((i) => i.readable).length;
  const withIssues = publications.filter((p) => p.issues > 0).length;
  const pages = catalog.reduce((sum, i) => sum + i.pages, 0);
  return (
    <>
      <Nav />
      <main className="pt-32 pb-24">
        <header className="mx-auto mb-12 max-w-7xl px-4 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
            The library
          </p>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-[-0.03em] sm:text-6xl">
            {catalog.length.toLocaleString()} issues.{" "}
            <span className="text-paper-dim">{publications.length} magazines.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-paper-dim">
            {pages.toLocaleString()} pages from {withIssues} of the{" "}
            {publications.length} titles we are tracking
            {readable === catalog.length
              ? ", every one of them readable online."
              : `; ${readable} ${readable === 1 ? "issue is" : "issues are"} readable online so far.`}
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
