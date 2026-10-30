import "server-only";

import { Link } from "@/modules/common/components/Link";
import { SmallBadge } from "@/modules/common/components/SmallBadge";
import { formatDate } from "@/modules/common/utils/formatDate";
import { SEASONAL_THEMES } from "@/modules/seasonal-events/utils/SEASONAL_THEMES";
import {
  ProfitDistributionPhaseEnd,
  TaskStatus,
  type CalendarEntry,
  type EventCalendarEntry,
} from "@sam-monorepo/application";
import { CalendarEntryType } from "@sam-monorepo/domain";
import clsx from "clsx";
import {
  CalendarDayStyle,
  formatCalendarDay,
  formatCalendarTime,
} from "../utils/formatCalendarDate";
import { CalendarEntryTypeIcon } from "./CalendarEntryTypeIcon";

/** How a row shows its day and its time */
export enum CalendarEntryDateStyle {
  /** For a flat list: the day, and the time of an entry with a time */
  DayAndTime = "day_and_time",
  /** For a list under day headings: only the time */
  TimeOnly = "time_only",
}

/** The event entries render the event card instead of a row */
type RowEntry = Exclude<CalendarEntry, EventCalendarEntry>;

interface RowContent {
  readonly title: string;
  /** More facts of the entry, for example the roles of a salary */
  readonly details: string | null;
  readonly badge: string | null;
}

const PHASE_END_TITLES: Record<ProfitDistributionPhaseEnd, string> = {
  [ProfitDistributionPhaseEnd.Collection]: "Ende der Sammelphase",
  [ProfitDistributionPhaseEnd.Payout]: "Ende der Auszahlungsphase",
};

/** The calendar leaves out the cancelled tasks */
const TASK_STATUS_BADGES: Record<TaskStatus, string | null> = {
  [TaskStatus.Open]: null,
  [TaskStatus.Completed]: "Erfüllt",
  [TaskStatus.Cancelled]: "Abgebrochen",
  [TaskStatus.Expired]: "Abgelaufen",
};

const getRowContent = (entry: RowEntry): RowContent => {
  switch (entry.type) {
    case CalendarEntryType.Birthday:
      return {
        title: `Geburtstag von ${entry.citizen.handle || entry.citizen.id}`,
        details: null,
        badge: null,
      };

    case CalendarEntryType.TaskDeadline:
      return {
        title: `Task-Frist: ${entry.task.title}`,
        details: null,
        badge: TASK_STATUS_BADGES[entry.status],
      };

    case CalendarEntryType.SilcSalary:
      return {
        title: `SILC-Gehalt: ${entry.value.toLocaleString("de-DE")} SILC`,
        details: entry.roleNames.join(", ") || null,
        badge: entry.isForecast ? "Voraussichtlich" : null,
      };

    case CalendarEntryType.ProfitDistribution:
      return {
        title: `${entry.cycle.title}: ${PHASE_END_TITLES[entry.phaseEnd]}`,
        details: null,
        badge: null,
      };

    case CalendarEntryType.PenaltyExpiry:
      return {
        title:
          entry.points === 1
            ? "1 Strafpunkt läuft ab"
            : `${entry.points} Strafpunkte laufen ab`,
        details: null,
        badge: null,
      };

    case CalendarEntryType.Seasonal:
      return {
        title: SEASONAL_THEMES[entry.event].title,
        details: null,
        badge: null,
      };

    default:
      throw new Error(`Unknown calendar entry: ${entry satisfies never}`);
  }
};

const formatEntryDate = (
  entry: RowEntry,
  dateStyle: CalendarEntryDateStyle,
) => {
  switch (dateStyle) {
    case CalendarEntryDateStyle.DayAndTime:
      return entry.time
        ? formatDate(entry.time, "long")
        : formatCalendarDay(entry.date, CalendarDayStyle.Short);

    case CalendarEntryDateStyle.TimeOnly:
      return entry.time ? formatCalendarTime(entry.time) : "Ganztägig";

    default:
      throw new Error(
        `Unknown calendar entry date style: ${dateStyle satisfies never}`,
      );
  }
};

interface Props {
  readonly className?: string;
  readonly entry: RowEntry;
  readonly dateStyle: CalendarEntryDateStyle;
}

/** A compact row for each entry that is not an event */
export const CalendarEntryRow = ({ className, entry, dateStyle }: Props) => {
  const { title, details, badge } = getRowContent(entry);

  return (
    <article
      className={clsx(
        "flex w-full items-center gap-3 corners-secondary bg-secondary px-4 py-3",
        className,
      )}
    >
      <CalendarEntryTypeIcon
        type={entry.type}
        className="flex-none text-xl text-neutral-500"
      />

      <div className="min-w-0 flex-1">
        <h3 className="font-bold wrap-break-word">
          {entry.href ? (
            <Link
              href={entry.href}
              className="text-interaction-500 hover:text-interaction-300 hover:underline focus-visible:underline active:text-interaction-300"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>

        <p className="text-sm text-neutral-500">
          {formatEntryDate(entry, dateStyle)}
          {details && <> · {details}</>}
        </p>
      </div>

      {badge && <SmallBadge value={badge} className="flex-none" />}
    </article>
  );
};
