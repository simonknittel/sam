import {
  CALENDAR_ENTRY_TYPES,
  type CalendarEntryType,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { CALENDAR_ENTRY_COLLECTORS } from "./calendarEntryCollectors.js";

/** An entry type, as the type filter of the calendar offers it */
export interface CalendarEntryTypeSetting {
  readonly type: CalendarEntryType;
  /** False when the citizen of the actor switched the type off */
  readonly enabled: boolean;
}

/**
 * The entry types that the actor can read, in the order of the type filter,
 * each with the switch of the citizen of the actor. A row means the citizen
 * switched the type off; a type without a row is switched on. An actor
 * without a citizen has no rows and cannot create any, thus each type is
 * switched on.
 */
export const findOwnCalendarEntryTypeSettings = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<CalendarEntryTypeSetting[]> => {
  const readableTypes = CALENDAR_ENTRY_TYPES.filter((type) =>
    CALENDAR_ENTRY_COLLECTORS[type].canRead(actor),
  );

  const citizenId = actor.citizen?.id;
  const switchedOffRows = citizenId
    ? await context.prisma.calendarEntryTypeSetting.findMany({
        // The entry type is a free string in the database
        where: { citizenId, entryType: { in: readableTypes } },
        select: { entryType: true },
      })
    : [];
  const switchedOffTypes = new Set<string>(
    switchedOffRows.map((row) => row.entryType),
  );

  return readableTypes.map((type) => ({
    type,
    enabled: !switchedOffTypes.has(type),
  }));
};
