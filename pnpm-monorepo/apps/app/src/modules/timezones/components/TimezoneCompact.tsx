"use client";

import clsx from "clsx";
import { getActiveTimeZoneName } from "../utils/getActiveTimeZoneName";

interface Props {
  readonly className?: string;
  readonly date: Date;
  readonly timeZone: string;
  readonly isLocalTimeZone?: boolean;
}

export const TimezoneCompact = ({
  className,
  date,
  timeZone,
  isLocalTimeZone,
}: Props) => {
  const timeZoneName = getActiveTimeZoneName(timeZone);

  return (
    <article
      className={clsx(
        "flex items-center justify-between gap-1 border-b border-white/5 p-1 last:border-b-0",
        className,
      )}
    >
      {timeZoneName && (
        <h3
          className={clsx("truncate text-xs", {
            "font-bold": isLocalTimeZone,
            "text-white/40": !isLocalTimeZone,
          })}
        >
          {isLocalTimeZone ? "Deine lokale Zeit" : timeZoneName}
        </h3>
      )}

      <p
        className={clsx("font-mono whitespace-nowrap uppercase", {
          "font-bold text-me": isLocalTimeZone,
        })}
      >
        {date.toLocaleDateString("de-DE", {
          timeZone,
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </article>
  );
};
