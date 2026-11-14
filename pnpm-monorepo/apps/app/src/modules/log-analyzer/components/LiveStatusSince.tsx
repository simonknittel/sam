import { formatDate } from "@/modules/common/utils/formatDate";
import { formatDuration } from "../utils/PATTERNS";

const MILLISECONDS_PER_SECOND = 1_000;

interface Props {
  readonly since: Date;
  readonly now: Date;
}

/** How long a state of the Live-Status lasts, for example "seit 12 min" */
export const LiveStatusSince = ({ since, now }: Props) => {
  const seconds = Math.max(
    0,
    (now.getTime() - since.getTime()) / MILLISECONDS_PER_SECOND,
  );

  return (
    <time
      dateTime={since.toISOString()}
      title={formatDate(since) || undefined}
      className="shrink-0 font-mono text-xs text-white/40"
    >
      seit {formatDuration(seconds)}
    </time>
  );
};
