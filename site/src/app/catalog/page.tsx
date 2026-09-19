import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { MAX_YEAR, MIN_YEAR, YEARS, publications } from "@/lib/catalog";
import { parseCatalogSearchParams, queryCatalog } from "@/lib/catalogQuery";
import { catalogMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = catalogMetadata();

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialQuery = parseCatalogSearchParams(params);
  const initial = queryCatalog(initialQuery);
  return (
    <>
      <Nav />
      <main className="pt-14">
        <h1 className="sr-only">Video game magazine archive</h1>
        <Suspense fallback={<div className="px-6 py-16 text-paper-dim">Loading catalog…</div>}>
          <CatalogBrowser
            publications={publications}
            years={YEARS}
            minYear={MIN_YEAR}
            maxYear={MAX_YEAR}
            initialQuery={initialQuery}
            initial={initial}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
