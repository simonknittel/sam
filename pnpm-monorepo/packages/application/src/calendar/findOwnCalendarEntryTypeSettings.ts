import {
  CALENDAR_ENTRY_TYPES,
  type CalendarEntryType,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { CALENDAR_ENTRY_COLLECTORS } from "./calendarEntryCollectors.js";

export interface CalendarEntryTypeSetting {
  readonly type: CalendarEntryType;
  readonly enabled: boolean;
}

/**
 * An actor without a citizen has no rows and cannot create any, thus each type
 * is switched on
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
