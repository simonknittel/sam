import { getChangelogQuarters } from "@/modules/changelog/queries/getChangelogQuarters";
import { formatQuarterLabel } from "@/modules/changelog/utils/quarter";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly activeQuarterSlug?: string;
}

export const Navigation = async ({ className, activeQuarterSlug }: Props) => {
  const quarters = await getChangelogQuarters();

  const quartersByYear = Map.groupBy(quarters, (quarter) => quarter.year);

  return (
    <nav
      aria-label="Zeitraum"
      className={clsx("flex flex-col gap-2", className)}
    >
      {[...quartersByYear].map(([year, quartersOfYear]) => (
        <div className="flex items-center gap-2" key={year}>
          <span className="w-10 font-mono text-sm font-bold text-white/40">
            {year}
          </span>

          {quartersOfYear.map((quarter) => (
            <Link
              aria-label={`${formatQuarterLabel(quarter.quarter)} ${year}`}
              className={clsx(
                "rounded-secondary px-3 py-1.5 font-mono text-sm font-bold transition-colors",
                activeQuarterSlug === quarter.slug
                  ? "bg-brand-red-500 text-white"
                  : "bg-neutral-800/50 text-white/40 hover:bg-neutral-700 hover:text-white focus-visible:bg-neutral-700 focus-visible:text-white active:bg-neutral-600",
              )}
              href={`/app/changelog/${quarter.slug}`}
              key={quarter.slug}
              /**
               * The quarters are a flat filter bar: a hover sweep across it
               * would prefetch every quarter, and each quarter page is large.
               */
              prefetch={false}
            >
              {formatQuarterLabel(quarter.quarter)}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
};
