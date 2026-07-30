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
        "p-1 flex gap-1 items-center justify-between border-b last:border-b-0 border-white/5",
        className,
      )}
    >
      {timeZoneName && (
        <h3
          className={clsx("text-xs truncate", {
            "font-bold": isLocalTimeZone,
            "text-white/40": !isLocalTimeZone,
          })}
        >
          {isLocalTimeZone ? "Deine lokale Zeit" : timeZoneName}
        </h3>
      )}

      <p
        className={clsx("font-mono uppercase whitespace-nowrap", {
          "text-me font-bold": isLocalTimeZone,
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
