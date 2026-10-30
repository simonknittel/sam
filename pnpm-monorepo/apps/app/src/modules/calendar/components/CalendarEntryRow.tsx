import "server-only";

import { Link } from "@/modules/common/components/Link";
import { SmallBadge } from "@/modules/common/components/SmallBadge";
import { SEASONAL_THEMES } from "@/modules/seasonal-events/utils/SEASONAL_THEMES";
import {
  ProfitDistributionPhaseEnd,
  TaskStatus,
  type CalendarEntry,
  type EventCalendarEntry,
} from "@sam-monorepo/application";
import { CalendarEntryType } from "@sam-monorepo/domain";
import clsx from "clsx";
import { formatCalendarTime } from "../utils/formatCalendarDate";
import { CalendarEntryTypeIcon } from "./CalendarEntryTypeIcon";

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
        badge: null,
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

/** The heading of the day gives the date, thus a row shows only the time */
const formatEntryTime = (entry: RowEntry) =>
  entry.time ? formatCalendarTime(entry.time) : "Ganztägig";

interface Props {
  readonly className?: string;
  readonly entry: RowEntry;
}

/**
 * A compact row for each entry that is not an event. With a link, the whole
 * row is clickable: the link stretches over the row, but its name stays the
 * title.
 */
export const CalendarEntryRow = ({ className, entry }: Props) => {
  const { title, details, badge } = getRowContent(entry);

  return (
    <article
      className={clsx(
        "flex w-full items-center gap-3 corners-secondary bg-secondary px-4 py-3",
        {
          "relative transition-colors focus-within:bg-secondary-hover hover:bg-secondary-hover active:bg-secondary-opaque":
            entry.href,
        },
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
              className="outline-hidden after:absolute after:inset-0 focus-visible:underline"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>

        <p className="text-sm text-neutral-500">
          {formatEntryTime(entry)}
          {details && <> · {details}</>}
        </p>
      </div>

      {badge && <SmallBadge value={badge} className="flex-none" />}
    </article>
  );
};
