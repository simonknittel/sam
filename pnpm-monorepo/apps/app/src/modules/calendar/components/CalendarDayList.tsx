import "server-only";

import { Note } from "@/modules/common/components/Note";
import type { CalendarEntry } from "@sam-monorepo/application";
import {
  findCalendarRangeProblem,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  toLocalDateKey,
  type LocalDate,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { createLoader, parseAsString, type SearchParams } from "nuqs/server";
import { getCalendarEntries } from "../queries/getCalendarEntries";
import {
  CALENDAR_FROM_PARAM,
  CALENDAR_RANGE_PROBLEM_TEXTS,
  CALENDAR_TO_PARAM,
  parseCalendarRange,
} from "../utils/calendarRange";
import {
  CalendarDayStyle,
  formatCalendarDay,
} from "../utils/formatCalendarDate";
import { CalendarEntryItem } from "./CalendarEntryItem";
import { CalendarEntryDateStyle } from "./CalendarEntryRow";

const loadSearchParams = createLoader({
  [CALENDAR_FROM_PARAM]: parseAsString,
  [CALENDAR_TO_PARAM]: parseAsString,
});

/** An entry with its position in the whole list */
interface PositionedEntry {
  readonly entry: CalendarEntry;
  readonly index: number;
}

interface CalendarDayProps {
  readonly date: LocalDate;
  readonly isToday: boolean;
  readonly entries: readonly PositionedEntry[];
}

const CalendarDay = ({ date, isToday, entries }: CalendarDayProps) => (
  <section className="flex flex-col gap-0.5">
    <h2 className="mb-2 flex items-baseline gap-2 font-mono text-lg uppercase">
      {formatCalendarDay(date, CalendarDayStyle.Long)}
      {isToday && <span className="text-sm text-green-500">Heute</span>}
    </h2>

    {entries.map(({ entry, index }) => (
      <CalendarEntryItem
        key={entry.key}
        entry={entry}
        index={index}
        dateStyle={CalendarEntryDateStyle.TimeOnly}
      />
    ))}
  </section>
);

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

/**
 * The entries of the range of the date filter, under a heading for each day
 * (in the time zone of the organization). A day without an entry has no
 * heading.
 */
export const CalendarDayList = async ({ className, searchParams }: Props) => {
  const { from, to } = await loadSearchParams(searchParams);
  const range = parseCalendarRange(from, to);

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

  const todayKey = toLocalDateKey(
    getLocalDate(new Date(), ORGANIZATION_TIMEZONE),
  );
  const entriesByDay = Map.groupBy(
    entries.map((entry, index) => ({ entry, index })),
    ({ entry }) => toLocalDateKey(entry.date),
  );

  return (
    <div className={clsx("flex flex-col gap-6", className)}>
      <p className="text-neutral-500">
        Zeitraum: {formatCalendarDay(range.start, CalendarDayStyle.Numeric)} –{" "}
        {formatCalendarDay(range.end, CalendarDayStyle.Numeric)}
      </p>

      {entriesByDay.size > 0 ? (
        [...entriesByDay].map(([dayKey, dayEntries]) => (
          <CalendarDay
            key={dayKey}
            date={dayEntries[0].entry.date}
            isToday={dayKey === todayKey}
            entries={dayEntries}
          />
        ))
      ) : (
        <div className="corners-secondary bg-secondary p-4">
          <p>In diesem Zeitraum gibt es keine Einträge.</p>
        </div>
      )}
    </div>
  );
};
