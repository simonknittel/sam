import type {
  CalendarEntryType,
  LocalDate,
  LocalDateRange,
  SeasonalEventKey,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { CitizenReference } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import type { EventListRow } from "../events/listEvents.js";
import type { TaskStatus } from "../tasks/taskRules.js";

/**
 * The fields of each entry of the calendar. Only the app shows the entries,
 * thus the keys are camelCase. The app writes the titles: they are German
 * texts of the user interface.
 */
interface CalendarEntryBase {
  /** Unique in a list of entries */
  readonly key: string;
  /** The day of the entry in the time zone of the organization */
  readonly date: LocalDate;
  /** The moment of an entry with a time, null for an entry of the whole day */
  readonly time: Date | null;
  /** The page of the source of the entry, null when the actor cannot open one */
  readonly href: string | null;
}

/** An event on the day of its start, with the row of the event card */
export interface EventCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.Event;
  readonly event: EventListRow;
  readonly isNew: boolean;
  readonly hasCancelledParticipation: boolean;
}

export interface BirthdayCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.Birthday;
  readonly citizen: CitizenReference;
}

/** The expiry of a task of the actor */
export interface TaskDeadlineCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.TaskDeadline;
  readonly task: {
    readonly id: string;
    readonly title: string;
  };
  /** Open, completed or expired: the calendar leaves out cancelled tasks */
  readonly status: TaskStatus;
}

/** All salaries of the actor on one day */
export interface SilcSalaryCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.SilcSalary;
  readonly value: number;
  /**
   * The roles that pay the salary, by name. Only the roles that the actor
   * can see (see `isRoleVisible`).
   */
  readonly roleNames: string[];
  /**
   * True for a salary that the current roles of the actor will pay, false
   * for a booking that the salary job made
   */
  readonly isForecast: boolean;
}

/** The phase of a profit distribution cycle that ends */
export enum ProfitDistributionPhaseEnd {
  Collection = "collection",
  Payout = "payout",
}

/** The planned end of a phase of a profit distribution cycle (SINcome) */
export interface ProfitDistributionCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.ProfitDistribution;
  readonly cycle: {
    readonly id: string;
    readonly title: string;
  };
  readonly phaseEnd: ProfitDistributionPhaseEnd;
}

/** The expiry of a penalty entry of the actor */
export interface PenaltyExpiryCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.PenaltyExpiry;
  readonly points: number;
}

/** A greeting day of a seasonal event */
export interface SeasonalCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.Seasonal;
  readonly event: SeasonalEventKey;
}

export type CalendarEntry =
  | EventCalendarEntry
  | BirthdayCalendarEntry
  | TaskDeadlineCalendarEntry
  | SilcSalaryCalendarEntry
  | ProfitDistributionCalendarEntry
  | PenaltyExpiryCalendarEntry
  | SeasonalCalendarEntry;

/** The range of a read of the calendar, as the collectors need it */
export interface CalendarQuery {
  readonly range: LocalDateRange;
  /** The first moment of the range in the time zone of the organization */
  readonly from: Date;
  /** The first moment after the range */
  readonly until: Date;
  /**
   * Also the events that started before the range and did not end yet (the
   * dashboard tile)
   */
  readonly includeRunningEvents: boolean;
}

/** The read of the entries of one type */
export interface CalendarEntryCollector<Entry extends CalendarEntry> {
  /**
   * The permission part of the read rule of the type. An actor for whom it
   * is false sees no entry of the type, and the type filter does not offer
   * the type.
   */
  readonly canRead: (actor: Actor) => boolean;
  /**
   * The entries of the range that the actor can see. The caller checks
   * `canRead` first.
   */
  readonly collect: (
    context: ApplicationContext,
    actor: Actor,
    query: CalendarQuery,
  ) => Promise<Entry[]>;
}
