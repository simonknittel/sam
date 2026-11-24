"use client";

import { useIsHydrated } from "@/modules/common/utils/useIsHydrated";
import { useNow } from "next-intl";

/**
 * Null when the browser does not know the zone: its data can be older than the
 * data of the server that stored the zone.
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
 * The server does not render it: its clock and its time-zone data are not the
 * ones of the viewer.
 */
export const LocalTime = ({ timezone }: Props) => {
  const now = useNow();
  const isHydrated = useIsHydrated();
  if (!isHydrated) return null;

  const localTime = formatLocalTime(timezone, now);
  if (!localTime) return null;

  return <span className="text-white/40">{localTime} Uhr</span>;
};
