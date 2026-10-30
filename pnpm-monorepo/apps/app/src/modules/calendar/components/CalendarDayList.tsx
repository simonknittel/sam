import "server-only";

import { Note } from "@/modules/common/components/Note";
import {
  findCalendarRangeProblem,
  toLocalDateKey,
  type LocalDateRange,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { getCalendarEntries } from "../queries/getCalendarEntries";
import { CALENDAR_RANGE_PROBLEM_TEXTS } from "../utils/calendarRange";
import { CalendarDayHeadingLevel, CalendarDays } from "./CalendarDays";

interface Props {
  readonly className?: string;
  readonly range: LocalDateRange;
}

/** The entries of the range of the date filter, under a heading for each day */
export const CalendarDayList = async ({ className, range }: Props) => {
  const rangeProblem = findCalendarRangeProblem(range);
  if (rangeProblem)
    return (
      <Note
        type="error"
        message={CALENDAR_RANGE_PROBLEM_TEXTS[rangeProblem]}
        className={className}
      />
    );

  const entries = await getCalendarEntries(
    toLocalDateKey(range.start),
    toLocalDateKey(range.end),
    false,
  );

  if (entries.length <= 0)
    return (
      <div className={clsx("corners-secondary bg-secondary p-4", className)}>
        <p>In diesem Zeitraum gibt es keine Einträge.</p>
      </div>
    );

  return (
    <CalendarDays
      entries={entries}
      headingLevel={CalendarDayHeadingLevel.Page}
      className={className}
    />
  );
};
