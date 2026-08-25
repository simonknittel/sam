import { Link } from "@/modules/common/components/Link";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import clsx from "clsx";
import type { ReactNode } from "react";

export enum ProfileMetricTone {
  Neutral = "neutral",
  Positive = "positive",
  Negative = "negative",
}

/** The characters the value scrambles through while it appears */
const NUMERIC_CHARACTERS = "1234567890.";

interface Props {
  readonly label: string;
  readonly icon: ReactNode;
  readonly value: number;
  /** Second line below the value, for example the monthly SILC salary */
  readonly hint?: string;
  readonly tone?: ProfileMetricTone;
  /** The Spynet page of the metric. Null when the viewer cannot open it. */
  readonly href: string | null;
}

/**
 * One number of a citizen profile, shown identically in the popover and in
 * the dashboard tile.
 */
export const ProfileMetric = ({
  label,
  icon,
  value,
  hint,
  tone = ProfileMetricTone.Neutral,
  href,
}: Props) => {
  const content = (
    <>
      <span
        className={clsx("font-black text-2xl", {
          "text-green-500": tone === ProfileMetricTone.Positive,
          "text-red-500": tone === ProfileMetricTone.Negative,
        })}
      >
        <ScrambleIn
          text={value.toLocaleString("de-de")}
          characters={NUMERIC_CHARACTERS}
        />
      </span>

      {hint && <span className="text-neutral-500 text-xs">{hint}</span>}

      <span className="text-neutral-500 text-xs flex gap-1 items-center">
        {icon}
        {label}
      </span>
    </>
  );

  const className =
    "flex-1 min-w-0 bg-white/5 flex flex-col justify-center items-center text-center p-2 rounded-secondary font-mono";

  if (!href) return <span className={className}>{content}</span>;

  return (
    <Link
      href={href}
      title={`${label} öffnen`}
      className={clsx(
        className,
        "hover:bg-white/10 focus-visible:bg-white/10 active:bg-white/15",
      )}
      prefetch={false}
    >
      {content}
    </Link>
  );
};
