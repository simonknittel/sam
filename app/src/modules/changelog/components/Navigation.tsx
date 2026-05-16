import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly activeYear?: string;
}

export const Navigation = ({ className, activeYear }: Props) => {
  return (
    <div
      className={clsx("flex gap-2", className)}
      role="group"
      aria-label="Filter by year"
    >
      {["2026", "2025"].map((year) => (
        <Link
          key={year}
          href={`/app/changelog/${year}`}
          className={`px-3 py-1.5 rounded-secondary font-mono uppercase text-sm font-bold transition-colors ${
            activeYear === year
              ? "bg-brand-red-500 text-white"
              : "bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-700"
          }`}
          aria-pressed={activeYear === year}
        >
          {year}
        </Link>
      ))}
    </div>
  );
};
