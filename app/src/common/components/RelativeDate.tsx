"use client";

import { useFormatter, useNow } from "next-intl";
import { formatDate } from "../utils/formatDate";

interface Props {
  readonly date: Date;
  readonly updateInterval?: number;
}

export const RelativeDate = ({ date, updateInterval = 60_000 }: Props) => {
  const now = useNow({
    updateInterval,
  });
  const format = useFormatter();

  return (
    <time
      dateTime={new Date(date).toISOString()}
      title={formatDate(date) || undefined}
    >
      {format.relativeTime(new Date(date), now)}
    </time>
  );
};
