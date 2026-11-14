import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { formatDuration } from "../utils/PATTERNS";

const MILLISECONDS_PER_SECOND = 1_000;

interface Props {
  readonly className?: string;
  readonly since: Date;
  readonly now: Date;
  readonly prefix?: string;
}

/** How long a state of the Live-Status lasts, for example "seit 12 min" */
export const LiveStatusSince = ({
  className,
  since,
  now,
  prefix = "seit",
}: Props) => {
  const seconds = Math.max(
    0,
    (now.getTime() - since.getTime()) / MILLISECONDS_PER_SECOND,
  );

  return (
    <time
      dateTime={since.toISOString()}
      title={formatDate(since) || undefined}
      className={clsx("shrink-0 font-mono text-white/40", className)}
    >
      {prefix} {formatDuration(seconds)}
    </time>
  );
};
