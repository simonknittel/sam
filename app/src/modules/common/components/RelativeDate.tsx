"use client";

import { useFormatter, useNow } from "next-intl";
import { formatDate } from "../utils/formatDate";

interface Props {
  readonly date: Date;
  readonly updateInterval?: number;
  readonly now?: Date;
}

export const RelativeDate = ({ date, updateInterval = 60_000, now }: Props) => {
  const _now = useNow({
    updateInterval,
  });
  const format = useFormatter();

  return (
    <time
      dateTime={new Date(date).toISOString()}
      title={formatDate(date) || undefined}
    >
      {format.relativeTime(new Date(date), now || _now)}
    </time>
  );
};
