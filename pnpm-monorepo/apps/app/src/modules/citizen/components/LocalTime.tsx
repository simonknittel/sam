"use client";

import { useIsHydrated } from "@/modules/common/utils/useIsHydrated";
import { useNow } from "next-intl";

/**
 * The time in the given IANA time zone. Returns null when the browser does
 * not know the zone, which can happen when its data is older than the data
 * of the server that stored the zone.
 */
const formatLocalTime = (timezone: string, now: Date) => {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(now);
  } catch {
    return null;
  }
};

interface Props {
  readonly timezone: string;
}

/**
 * The current time of a citizen, read once in the browser. The server does
 * not render it: its clock and its time-zone data are not the ones of the
 * viewer. The time does not keep ticking.
 */
export const LocalTime = ({ timezone }: Props) => {
  const now = useNow();
  const isHydrated = useIsHydrated();
  if (!isHydrated) return null;

  const localTime = formatLocalTime(timezone, now);
  if (!localTime) return null;

  return <span className="text-white/40">{localTime} Uhr</span>;
};
