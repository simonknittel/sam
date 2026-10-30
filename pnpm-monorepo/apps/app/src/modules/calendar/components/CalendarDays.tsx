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
    <Heading className="mb-2 flex items-center gap-2 font-mono text-lg text-white/60 uppercase">
      {formatCalendarDay(date)}
      {isToday && (
        <span className="rounded-secondary border border-blue-500 bg-blue-500/20 px-1 py-0.5 font-mono text-xs text-text-primary uppercase opacity-60">
          Heute
        </span>
      )}
    </Heading>

    {entries.length > 0 ? (
      entries.map(({ entry, index }) => (
        <CalendarEntryItem key={entry.key} entry={entry} index={index} />
      ))
    ) : (
      <p className="text-sm text-white/40">Keine Einträge</p>
    )}
  </section>
);

interface Props {
  readonly className?: string;
  readonly entries: readonly CalendarEntry[];
  /**
   * The days to show in this order, also the days without an entry. Without
   * it, only the days with an entry show, the earliest day first.
   */
  readonly days?: readonly LocalDate[];
  readonly headingLevel: CalendarDayHeadingLevel;
}

/**
 * The entries under a heading for each day (in the time zone of the
 * organization).
 */
export const CalendarDays = ({
  className,
  entries,
  days,
  headingLevel,
}: Props) => {
  const todayKey = getLocalDateKey(new Date(), ORGANIZATION_TIMEZONE);
  const entriesByDay = Map.groupBy(entries, (entry) =>
    toLocalDateKey(entry.date),
  );
  const shownDays =
    days ??
    Array.from(entriesByDay.values(), (dayEntries) => dayEntries[0].date);
  /** The position counts in the order of the days, which can be the reverse */
  const positionedEntriesByDay = Map.groupBy(
    shownDays
      .flatMap((date) => entriesByDay.get(toLocalDateKey(date)) ?? [])
      .map((entry, index) => ({ entry, index })),
    ({ entry }) => toLocalDateKey(entry.date),
  );

  return (
    <div className={clsx("flex flex-col gap-6", className)}>
      {shownDays.map((date) => {
        const dayKey = toLocalDateKey(date);

        return (
          <CalendarDay
            key={dayKey}
            date={date}
            isToday={dayKey === todayKey}
            entries={positionedEntriesByDay.get(dayKey) ?? []}
            headingLevel={headingLevel}
          />
        );
      })}
    </div>
  );
};
