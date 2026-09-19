import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { IssueComments } from "@/components/issue/IssueComments";
import { IssueWatch } from "@/components/issue/IssueWatch";
import { RecommendedRail, RecommendedRailFooter } from "@/components/issue/RecommendedRail";
import { SameYearCatalogs } from "@/components/issue/SameYearCatalogs";
import { Nav } from "@/components/Nav";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  eraOf,
  getIssue,
  getPublication,
  recommendedIssues,
  sameYearOtherTitles,
} from "@/lib/catalog";
import { loadManifest } from "@/lib/manifest";
import {
  breadcrumbJsonLd,
  issueDescription,
  issueJsonLd,
  issueMetadata,
  magazinePath,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return {};
  const pub = getPublication(issue.publication);
  const title = pub?.title ?? issue.publication;
  return issueMetadata(title, issue);
}

export default async function IssuePage({ params }: Props) {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) notFound();

  const manifest = await loadManifest(issue.slug);
  const pub = getPublication(issue.publication);
  const pubTitle = pub?.title ?? issue.publication;
  const era = eraOf(issue.era);
  const recommended = recommendedIssues(issue);
  const sameYear = sameYearOtherTitles(issue);
  const description = issueDescription(pubTitle, issue);

  return (
    <>
      {pub && (
        <>
          <JsonLd data={issueJsonLd(pub, issue)} />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: pub.title, path: magazinePath(pub.id) },
              { name: `Issue ${issue.number}`, path: `/issue/${issue.slug}` },
            ])}
          />
        </>
      )}
      <Nav />
      <main className="pb-24 pt-14">
        <div className="w-full px-4 py-6 sm:px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-6 xl:px-8">
          <div>
            <IssueWatch
              issue={issue}
              pubTitle={pubTitle}
              pub={pub}
              era={era}
              description={description}
              manifest={manifest}
            />
            <div className="mt-8">
              <SameYearCatalogs year={issue.year} issues={sameYear} />
            </div>
            <div className="mt-8">
              <IssueComments slug={issue.slug} />
            </div>
          </div>

          <div className="mt-10 lg:mt-0">
            <RecommendedRail issues={recommended} />
            <RecommendedRailFooter publicationId={issue.publication} year={issue.year} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
