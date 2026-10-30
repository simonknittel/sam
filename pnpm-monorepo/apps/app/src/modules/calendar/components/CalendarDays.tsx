import "server-only";

import type { CalendarEntry } from "@sam-monorepo/application";
import {
  getLocalDateKey,
  ORGANIZATION_TIMEZONE,
  toLocalDateKey,
  type LocalDate,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { formatCalendarDay } from "../utils/formatCalendarDate";
import { CalendarEntryItem } from "./CalendarEntryItem";

/** The level of the day headings below the heading of the page or the tile */
export enum CalendarDayHeadingLevel {
  Page = "h2",
  Tile = "h3",
}

/** An entry with its position in the whole list */
interface PositionedEntry {
  readonly entry: CalendarEntry;
  readonly index: number;
}

interface CalendarDayProps {
  readonly date: LocalDate;
  readonly isToday: boolean;
  readonly entries: readonly PositionedEntry[];
  readonly headingLevel: CalendarDayHeadingLevel;
}

const CalendarDay = ({
  date,
  isToday,
  entries,
  headingLevel: Heading,
}: CalendarDayProps) => (
  <section className="flex flex-col gap-0.5">
    <Heading className="mb-2 flex items-baseline gap-2 font-mono text-lg uppercase">
      {formatCalendarDay(date)}
      {isToday && <span className="text-sm text-green-500">Heute</span>}
    </Heading>

    {entries.map(({ entry, index }) => (
      <CalendarEntryItem key={entry.key} entry={entry} index={index} />
    ))}
  </section>
);

interface Props {
  readonly className?: string;
  readonly entries: readonly CalendarEntry[];
  readonly headingLevel: CalendarDayHeadingLevel;
}

/**
 * The entries under a heading for each day (in the time zone of the
 * organization). A day without an entry has no heading.
 */
export const CalendarDays = ({ className, entries, headingLevel }: Props) => {
  const todayKey = getLocalDateKey(new Date(), ORGANIZATION_TIMEZONE);
  const entriesByDay = Map.groupBy(
    entries.map((entry, index) => ({ entry, index })),
    ({ entry }) => toLocalDateKey(entry.date),
  );

  return (
    <div className={clsx("flex flex-col gap-6", className)}>
      {[...entriesByDay].map(([dayKey, dayEntries]) => (
        <CalendarDay
          key={dayKey}
          date={dayEntries[0].entry.date}
          isToday={dayKey === todayKey}
          entries={dayEntries}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
};
