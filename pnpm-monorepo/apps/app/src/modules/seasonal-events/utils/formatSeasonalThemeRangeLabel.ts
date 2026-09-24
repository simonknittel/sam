import { getMonthName } from "@/modules/citizen/utils/birthday";
import {
  SEASONAL_EVENT_DEFINITIONS,
  type SeasonalEventKey,
} from "@sam-monorepo/domain";

interface MonthDay {
  readonly month: number;
  readonly day: number;
}

const formatDay = ({ month, day }: MonthDay) =>
  `${day}. ${getMonthName(month)}`;

/**
 * The theme range of an event as a German label, for example
 * "1. bis 31. Oktober". A range inside one month names the month once. The
 * label is derived from the calendar of the domain package, thus it cannot
 * drift away from the days the theme really covers.
 */
export const formatSeasonalThemeRangeLabel = (event: SeasonalEventKey) => {
  const { themeRange } = SEASONAL_EVENT_DEFINITIONS[event];

  if (themeRange.start.month === themeRange.end.month)
    return `${themeRange.start.day}. bis ${formatDay(themeRange.end)}`;

  return `${formatDay(themeRange.start)} bis ${formatDay(themeRange.end)}`;
};
