import type { Prisma } from "@sam-monorepo/database/client";
import {
  CalendarEntryType,
  FALLBACK_EVENT_DURATION_MILLISECONDS,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import { findEventCardRows } from "../events/listEvents.js";
import type {
  CalendarEntryCollector,
  EventCalendarEntry,
} from "./calendarEntry.js";

/**
 * The events that the actor can see (see `findEventCardRows`), on the day of
 * their start
 */
export const eventEntryCollector: CalendarEntryCollector<EventCalendarEntry> = {
  canRead: (actor) => actor.authorize("event", "read"),
  collect: async (context, actor, { from, until, includeRunningEvents }) => {
    const startsInRangeWhere: Prisma.EventWhereInput = {
      startTime: { gte: from, lt: until },
    };
    const now = context.now();
    /** The same end as `getEventEndTime`, also for an event without an end */
    const runningWhere: Prisma.EventWhereInput = {
      startTime: { lt: from },
      OR: [
        { endTime: { gt: now } },
        {
          endTime: null,
          startTime: {
            gt: new Date(now.getTime() - FALLBACK_EVENT_DURATION_MILLISECONDS),
          },
        },
      ],
    };

    const { events, cancelledParticipationEventIds, newEventIds } =
      await findEventCardRows(
        context,
        actor,
        includeRunningEvents
          ? { OR: [startsInRangeWhere, runningWhere] }
          : startsInRangeWhere,
      );
    const cancelledEventIds = new Set(cancelledParticipationEventIds);

    return events.map((event) => ({
      type: CalendarEntryType.Event,
      key: `event:${event.id}`,
      date: getLocalDate(event.startTime, ORGANIZATION_TIMEZONE),
      time: event.startTime,
      href: `/app/events/${event.id}`,
      event,
      isNew: newEventIds.has(event.id),
      hasCancelledParticipation: cancelledEventIds.has(event.id),
    }));
  },
};
