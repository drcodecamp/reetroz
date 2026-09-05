import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reader } from "@/components/reader/Reader";
import { catalog, getIssue } from "@/lib/catalog";
import { loadManifest } from "@/lib/manifest";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string; play?: string }>;
};

export function generateStaticParams() {
  return catalog.filter((i) => i.readable).map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssue(slug);
  return {
    title: issue ? `Reading CGW #${issue.number} · ${issue.date} | Pixel Press` : "Reader",
    robots: { index: false },
  };
}

export default async function ReadPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { p, play } = await searchParams;
  const issue = getIssue(slug);
  if (!issue) notFound();

  const manifest = await loadManifest(issue.slug);
  if (!manifest) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
            Not yet digitised
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold">
            Issue #{issue.number} isn&apos;t readable online yet.
          </h1>
          <Link href={`/issue/${issue.slug}`} className="mt-6 inline-block text-amber">
            ← Back to the issue
          </Link>
        </div>
      </main>
    );
  }

  const initialPage = Number(p) || 1;
  return (
    <Reader
      issue={issue}
      manifest={manifest}
      initialPage={initialPage}
      autoplay={play === "1"}
    />
  );
}
