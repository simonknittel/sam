"use client";

import { Popover } from "@/modules/common/components/Popover";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import clsx from "clsx";
import { useNow } from "next-intl";
import type { ReactNode } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { getActiveTimeZoneName } from "../utils/getActiveTimeZoneName";

interface Props {
  readonly className?: string;
  readonly heading: string;
  readonly headingClassName?: string;
  readonly subheading?: string;
  readonly timeZone: string;
  readonly timeZoneName?: string;
  readonly timezonePopoverChildren?: ReactNode;
}

export const Timezone = ({
  className,
  heading,
  headingClassName,
  subheading,
  timeZone,
  timezonePopoverChildren,
}: Props) => {
  const date = useNow({ updateInterval: 1000 });
  const timeZoneName = getActiveTimeZoneName(timeZone);

  return (
    <article
      className={clsx(
        "text-center bg-secondary p-4 rounded-primary flex-1 flex flex-col justify-center",
        className,
      )}
    >
      <h3 className={clsx("text-xl", headingClassName)}>{heading}</h3>
      {subheading && <h4 className="text-xs text-white/40">{subheading}</h4>}

      {/* Time */}
      <p className="font-mono uppercase text-4xl font-bold mt-4">
        <ScrambleIn
          text={date.toLocaleString("de-DE", {
            timeZone,
            hour: "2-digit",
            minute: "2-digit",
          })}
          duration={1000}
          characters="1234567890:"
        />
      </p>

      {/* Date */}
      <p className="font-mono uppercase text-white/40">
        <ScrambleIn
          text={date.toLocaleDateString("de-DE", {
            timeZone,
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
          duration={1000}
          characters="1234567890."
        />
      </p>

      {/* Timezone name */}
      {timeZoneName && timezonePopoverChildren && (
        <Popover
          trigger={
            <span className="inline-flex items-center gap-2 mt-4 text-white/40 cursor-help text-xs">
              <span>{timeZoneName}</span>
              <FaInfoCircle className="flex-none mt-0.5" />
            </span>
          }
          enableHover
        >
          {timezonePopoverChildren}
        </Popover>
      )}
      {timeZoneName && !timezonePopoverChildren && (
        <span className="block mt-4 text-white/40 text-xs">{timeZoneName}</span>
      )}
    </article>
  );
};
