import "server-only";

import {
  getLocalDate,
  getNextDayWithoutSeasonalEvent,
  getNextSeasonalGreetingStart,
  getNextSeasonalThemeStart,
  ORGANIZATION_TIMEZONE,
  SeasonalEventKey,
  type LocalDate,
} from "@sam-monorepo/domain";
import { SEASONAL_THEMES } from "./SEASONAL_THEMES";
import { formatSeasonalDateOverrideCookie } from "./seasonalDateOverrideCookie";

export interface SeasonalDatePreset {
  readonly label: string;
  /** The value of the date override cookie */
  readonly date: string;
}

const toPresets = (
  label: string,
  date: LocalDate | null,
): SeasonalDatePreset[] =>
  date ? [{ label, date: formatSeasonalDateOverrideCookie(date) }] : [];

/**
 * The dates the admin toolbar offers for the seasonal override: the first
 * theme day and the first greeting day of each event, and a day without a
 * theme. Each date is the next one from today on, thus the year a greeting
 * shows is the year of the next occurrence.
 */
export const getSeasonalDatePresets = (): readonly SeasonalDatePreset[] => {
  const today = getLocalDate(new Date(), ORGANIZATION_TIMEZONE);

  return [
    ...Object.values(SeasonalEventKey).flatMap((event) => {
      const { title } = SEASONAL_THEMES[event];

      return [
        ...toPresets(title, getNextSeasonalThemeStart(event, today)),
        ...toPresets(
          `${title} greeting`,
          getNextSeasonalGreetingStart(event, today),
        ),
      ];
    }),
    ...toPresets("No theme", getNextDayWithoutSeasonalEvent(today)),
  ];
};
