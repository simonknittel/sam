import { getChangelogQuarters } from "@/modules/changelog/queries/getChangelogQuarters";
import {
  formatQuarterLabel,
  type ChangelogQuarter,
} from "@/modules/changelog/utils/quarter";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly activeQuarterSlug?: string;
}

export const Navigation = async ({ className, activeQuarterSlug }: Props) => {
  const quarters = await getChangelogQuarters();

  const quartersByYear = new Map<string, ChangelogQuarter[]>();
  for (const quarter of quarters) {
    const existing = quartersByYear.get(quarter.year);
    if (existing) {
      existing.push(quarter);
    } else {
      quartersByYear.set(quarter.year, [quarter]);
    }
  }

  return (
    <nav
      aria-label="Zeitraum"
      className={clsx("flex flex-col gap-2", className)}
    >
      {[...quartersByYear].map(([year, quartersOfYear]) => (
        <div className="flex items-center gap-2" key={year}>
          <span className="font-mono text-sm font-bold text-white/40 w-10">
            {year}
          </span>

          {quartersOfYear.map((quarter) => (
            <Link
              aria-label={`${formatQuarterLabel(quarter.quarter)} ${year}`}
              className={clsx(
                "px-3 py-1.5 rounded-secondary font-mono text-sm font-bold transition-colors",
                activeQuarterSlug === quarter.slug
                  ? "bg-brand-red-500 text-white"
                  : "bg-neutral-800/50 text-white/40 hover:text-white hover:bg-neutral-700 focus-visible:text-white focus-visible:bg-neutral-700 active:bg-neutral-600",
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
