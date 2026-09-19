import Link from "next/link";
import { IssueCard } from "@/components/IssueCard";
import { getPublication, isUndated, type CatalogIssue } from "@/lib/catalog";

type Props = {
  year: number;
  issues: CatalogIssue[];
};

export function SameYearCatalogs({ year, issues }: Props) {
  if (isUndated(year) || issues.length === 0) return null;

  return (
    <section className="border-t border-paper/8 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Also on the rack in {year}</h2>
          <p className="mt-1 text-base text-paper-dim">
            Other magazines from the same year.
          </p>
        </div>
        <Link
          href={`/catalog?from=${year}&to=${year}`}
          className="text-base text-amber hover:text-amber-2"
        >
          All of {year}
        </Link>
      </div>

      <div className="mask-fade-r mt-5 flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {issues.map((item) => (
          <div key={item.slug} className="w-[132px] shrink-0 sm:w-[148px]">
            <IssueCard
              issue={item}
              publication={getPublication(item.publication)}
              sizes="148px"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
