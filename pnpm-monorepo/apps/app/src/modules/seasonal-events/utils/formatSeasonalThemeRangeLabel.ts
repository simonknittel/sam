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

/** For example "1. bis 31. Oktober" */
export const formatSeasonalThemeRangeLabel = (event: SeasonalEventKey) => {
  const { themeRange } = SEASONAL_EVENT_DEFINITIONS[event];

  if (themeRange.start.month === themeRange.end.month)
    return `${themeRange.start.day}. bis ${formatDay(themeRange.end)}`;

  return `${formatDay(themeRange.start)} bis ${formatDay(themeRange.end)}`;
};
