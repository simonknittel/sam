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

interface CalendarEntryBase {
  readonly key: string;
  /** The day of the entry in the time zone of the organization */
  readonly date: LocalDate;
  /** The moment of an entry with a time, null for an entry of the whole day */
  readonly time: Date | null;
  /** The page of the source of the entry, null when the actor cannot open one */
  readonly href: string | null;
}

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

export interface TaskDeadlineCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.TaskDeadline;
  readonly task: {
    readonly id: string;
    readonly title: string;
  };
  /** Open, completed or expired: the calendar leaves out cancelled tasks */
  readonly status: TaskStatus;
}

export interface SilcSalaryCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.SilcSalary;
  readonly value: number;
  /** Only the roles that the actor can see (see `isRoleVisible`) */
  readonly roleNames: string[];
}

export enum ProfitDistributionPhaseEnd {
  Collection = "collection",
  Payout = "payout",
}

export interface ProfitDistributionCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.ProfitDistribution;
  readonly cycle: {
    readonly id: string;
    readonly title: string;
  };
  readonly phaseEnd: ProfitDistributionPhaseEnd;
}

export interface PenaltyExpiryCalendarEntry extends CalendarEntryBase {
  readonly type: CalendarEntryType.PenaltyExpiry;
  readonly points: number;
}

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

export interface CalendarQuery {
  readonly range: LocalDateRange;
  /** The first moment of the range in the time zone of the organization */
  readonly from: Date;
  /** The first moment after the range */
  readonly until: Date;
  /** Also the events that started before the range and did not end yet */
  readonly includeRunningEvents: boolean;
}

export interface CalendarEntryCollector<Entry extends CalendarEntry> {
  /**
   * An actor for whom it is false sees no entry of the type, and the type
   * filter does not offer the type
   */
  readonly canRead: (actor: Actor) => boolean;
  /** The caller checks `canRead` first */
  readonly collect: (
    context: ApplicationContext,
    actor: Actor,
    query: CalendarQuery,
  ) => Promise<Entry[]>;
}
