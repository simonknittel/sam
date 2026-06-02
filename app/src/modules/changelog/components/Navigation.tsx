import { getChangelogYears } from "@/modules/changelog/queries/getChangelogYears";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly activeYear?: string;
}

export const Navigation = async ({ className, activeYear }: Props) => {
  const years = await getChangelogYears();

  return (
    <div className={clsx("flex gap-2", className)}>
      {years.map((year) => (
        <Link
          className={clsx(
            "px-3 py-1.5 rounded-secondary font-mono uppercase text-sm font-bold transition-colors",
            activeYear === year
              ? "bg-brand-red-500 text-white"
              : "bg-neutral-800/50 text-white/400 hover:text-white hover:bg-neutral-700",
          )}
          href={`/app/changelog/${year}`}
          key={year}
        >
          {year}
        </Link>
      ))}
    </div>
  );
};
