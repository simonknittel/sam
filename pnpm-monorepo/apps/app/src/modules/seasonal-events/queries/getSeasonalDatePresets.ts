import "server-only";

import {
  getLocalDate,
  getNextDayWithoutSeasonalEvent,
  getNextSeasonalGreetingStart,
  getNextSeasonalThemeStart,
  ORGANIZATION_TIMEZONE,
  SeasonalEventKey,
} from "@sam-monorepo/domain";
import { SEASONAL_THEMES } from "../utils/SEASONAL_THEMES";
import { formatSeasonalDateOverrideCookie } from "../utils/seasonalDateOverrideCookie";

export interface SeasonalDatePreset {
  readonly label: string;
  /** The value of the date override cookie */
  readonly date: string;
}

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
        {
          label: title,
          date: formatSeasonalDateOverrideCookie(
            getNextSeasonalThemeStart(event, today),
          ),
        },
        {
          label: `${title} greeting`,
          date: formatSeasonalDateOverrideCookie(
            getNextSeasonalGreetingStart(event, today),
          ),
        },
      ];
    }),
    {
      label: "No theme",
      date: formatSeasonalDateOverrideCookie(
        getNextDayWithoutSeasonalEvent(today),
      ),
    },
  ];
};
