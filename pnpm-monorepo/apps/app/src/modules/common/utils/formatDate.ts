import { ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";

const OPTIONS_BY_STYLE = {
  // Example: "04.09."
  extra_short: {
    month: "2-digit",
    day: "2-digit",
  },
  // Example: "04.09.2024"
  short: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
  // Example: "Mi., 4. September um 14:30"
  long: {
    weekday: "short",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  // Example: "Mi., 4. September 2024 um 14:30"
  long_with_year: {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  // Example: "04.09.2024, 14:30"
  default: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/**
 * Formats a moment as a German date in the time zone of the organization,
 * thus the server and the browser show the same value. The comparison of two
 * dates in the "short" style tells if they are on the same day.
 */
export const formatDate = (
  date?: Date | null,
  style?: "extra_short" | "short" | "long" | "long_with_year",
) =>
  date?.toLocaleDateString("de-DE", {
    timeZone: ORGANIZATION_TIMEZONE,
    ...OPTIONS_BY_STYLE[style ?? "default"],
  }) || null;
