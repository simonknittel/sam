import { prisma } from "@/db";
import type {
  ActivityEntry,
  ActivitySource,
} from "@/modules/activity/utils/activityEntry";
import type { ActivityFilters } from "@/modules/activity/utils/activityFilterParams";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  buildCursorConditions,
  compareMergedCursorEntries,
  cursorOrderBy,
  isBeyondCursorPosition,
  type MergedCursorSourceInput,
} from "@/modules/common/CursorPagination/mergedCursor";
import { formatDate } from "@/modules/common/utils/formatDate";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  EventActivityType,
  type Event,
  type Prisma,
} from "@sam-monorepo/database/client";
import { z } from "zod";
import {
  EventActivitySourceKey,
  EventScheduleEntry,
} from "./eventActivityTypes";

const titleUpdatedPayloadSchema = z.object({
  previousName: z.string(),
  newName: z.string(),
});

const scheduleUpdatedPayloadSchema = z.object({
  previousStartTime: z.coerce.date(),
  newStartTime: z.coerce.date(),
  previousEndTime: z.coerce.date().nullable(),
  newEndTime: z.coerce.date().nullable(),
});

const commentPayloadSchema = z.object({
  comment: z.string().nullable(),
});

const lineupToggledPayloadSchema = z.object({
  enabled: z.boolean(),
});

interface Input {
  readonly eventId: Event["id"];
  readonly filters?: ActivityFilters;
}

export const createEventActivitySource = ({
  eventId,
  filters,
}: Input): ActivitySource =>
  withTrace(
    "eventActivitySource",
    async ({ position, direction, take }: MergedCursorSourceInput) => {
      const storedTypes = getSelectedStoredTypes(filters);
      if (storedTypes?.length === 0) return [];

      const activities = await prisma.eventActivity.findMany({
        where: {
          AND: [
            {
              eventId,
              ...(storedTypes ? { type: { in: storedTypes } } : {}),
              ...(filters?.actorIds
                ? { citizenId: { in: filters.actorIds } }
                : {}),
              ...(filters && Object.keys(filters.createdAt).length > 0
                ? { createdAt: filters.createdAt }
                : {}),
            },
            ...buildCursorConditions(
              position,
              EventActivitySourceKey.Activity,
              direction,
            ),
          ],
        },
        orderBy: cursorOrderBy(direction),
        take,
        include: {
          citizen: {
            select: {
              id: true,
              handle: true,
            },
          },
        },
      });

      return activities.map(buildActivityEntry);
    },
  );

interface ScheduleInput {
  readonly event: Pick<Event, "startTime" | "endTime">;
  readonly filters?: ActivityFilters;
}

/**
 * Start and end are computed from the event, so this source paginates in
 * memory over at most two entries — the merging treats it like any other.
 */
export const createEventScheduleSource =
  ({ event, filters }: ScheduleInput): ActivitySource =>
  // eslint-disable-next-line @typescript-eslint/require-await
  async ({ position, direction, take }: MergedCursorSourceInput) => {
    /** Nobody caused these, so an actor filter can only exclude them */
    if (filters?.actorIds) return [];

    const now = new Date();
    const entries: ActivityEntry[] = [];

    if (event.startTime <= now)
      entries.push({
        sourceKey: EventActivitySourceKey.Schedule,
        id: EventScheduleEntry.Start,
        date: event.startTime,
        message: "Das Event hat begonnen",
      });

    if (event.endTime && event.endTime <= now)
      entries.push({
        sourceKey: EventActivitySourceKey.Schedule,
        id: EventScheduleEntry.End,
        date: event.endTime,
        message: "Das Event ist zu Ende",
      });

    return entries
      .filter((entry) => isWithinRange(entry.date, filters))
      .filter((entry) => isBeyondCursorPosition(entry, position, direction))
      .toSorted((a, b) =>
        direction === CursorDirection.Next
          ? compareMergedCursorEntries(a, b)
          : compareMergedCursorEntries(b, a),
      )
      .slice(0, take);
  };

const isWithinRange = (date: Date, filters?: ActivityFilters) => {
  if (filters?.createdAt.gte && date < filters.createdAt.gte) return false;
  if (filters?.createdAt.lt && date >= filters.createdAt.lt) return false;
  return true;
};

/**
 * The stored activity types the type filter selects, or `null` when it is not
 * narrowing the stored ones down at all.
 */
const getSelectedStoredTypes = (filters?: ActivityFilters) => {
  if (!filters?.types) return null;

  const storedTypes = Object.values(EventActivityType);
  return filters.types.filter((type): type is EventActivityType =>
    storedTypes.includes(type as EventActivityType),
  );
};

type ActivityRow = Prisma.EventActivityGetPayload<{
  include: { citizen: { select: { id: true; handle: true } } };
}>;

const buildActivityEntry = (activity: ActivityRow): ActivityEntry => {
  const base = {
    sourceKey: EventActivitySourceKey.Activity,
    id: activity.id,
    date: activity.createdAt,
    actor: activity.citizen,
  };

  switch (activity.type) {
    case EventActivityType.CREATED:
      return { ...base, message: "Event erstellt" };

    case EventActivityType.TITLE_UPDATED: {
      const payload = titleUpdatedPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: payload.success ? (
          <>
            Titel von{" "}
            <span className="font-bold">{payload.data.previousName}</span> zu{" "}
            <span className="font-bold">{payload.data.newName}</span> geändert
          </>
        ) : (
          "Titel geändert"
        ),
      };
    }

    case EventActivityType.DESCRIPTION_UPDATED:
      return { ...base, message: "Beschreibung aktualisiert" };

    case EventActivityType.SCHEDULE_UPDATED: {
      const payload = scheduleUpdatedPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: payload.success
          ? `Zeitraum geändert: ${formatDate(payload.data.newStartTime)} bis ${
              formatDate(payload.data.newEndTime) || "-"
            }`
          : "Zeitraum geändert",
      };
    }

    case EventActivityType.PARTICIPATION_SIGNED_UP: {
      const payload = commentPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: "Angemeldet",
        comment: payload.success ? payload.data.comment : null,
      };
    }

    case EventActivityType.PARTICIPATION_COMMENT_UPDATED: {
      const payload = commentPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: "Kommentar aktualisiert",
        comment: payload.success ? payload.data.comment : null,
      };
    }

    case EventActivityType.PARTICIPATION_CANCELLED:
      return { ...base, message: "Abgemeldet" };

    case EventActivityType.LINEUP_TOGGLED: {
      const payload = lineupToggledPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message:
          payload.success && !payload.data.enabled
            ? "Aufstellung zurückgezogen"
            : "Aufstellung veröffentlicht",
      };
    }

    default:
      throw new Error(
        `Unknown activity type: ${activity.type satisfies never}`,
      );
  }
};
