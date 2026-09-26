"use client";

import { useFormatter, useNow } from "next-intl";
import { formatDate } from "../utils/formatDate";

interface Props {
  readonly date: Date;
  /** Ignored when the caller gives `now` */
  readonly updateInterval?: number;
  /**
   * The time of a clock which the caller owns, for example one clock for all
   * rows of a table. The component then starts no interval of its own.
   */
  readonly now?: Date;
  readonly className?: string;
}

export const RelativeDate = ({
  date,
  updateInterval = 60_000,
  now,
  className,
}: Props) => {
  /** `useNow` starts no interval without an `updateInterval` */
  const ownNow = useNow({
    updateInterval: now ? undefined : updateInterval,
  });
  const format = useFormatter();

  return (
    <time
      dateTime={new Date(date).toISOString()}
      title={formatDate(date) || undefined}
      className={className}
    >
      {format.relativeTime(new Date(date), now ?? ownNow)}
    </time>
  );
};
