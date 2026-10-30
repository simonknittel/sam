import type {
  ActivityEntry,
  ActivitySource,
} from "@/modules/activity/utils/activityEntry";
import type { ActivityFilters } from "@/modules/activity/utils/activityFilterParams";
import { getApplicationContext, getRequestActor } from "@/modules/application";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { formatDate } from "@/modules/common/utils/formatDate";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findEventActivityRows,
  type EventActivityRow,
} from "@sam-monorepo/application";
import { EventActivityType, type Event } from "@sam-monorepo/database/client";
import {
  compareMergedCursorEntries,
  isBeyondCursorPosition,
  type MergedCursorSourceInput,
} from "@sam-monorepo/domain";
import * as z from "zod";
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

const participationToggledPayloadSchema = z.object({
  enabled: z.boolean(),
  cancelledParticipantCount: z.number(),
});

const participantAddedPayloadSchema = z.object({
  citizenId: z.string(),
  comment: z.string().nullable(),
});

const participantRemovedPayloadSchema = z.object({
  citizenId: z.string(),
  reason: z.string().nullable(),
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
    async (sourceInput: MergedCursorSourceInput) => {
      const storedTypes = getSelectedStoredTypes(filters);
      if (storedTypes?.length === 0) return [];

      const activities = await findEventActivityRows(
        getApplicationContext(),
        await getRequestActor(),
        {
          ...sourceInput,
          eventId,
          sourceKey: EventActivitySourceKey.Activity,
          types: storedTypes,
          actorIds: filters?.actorIds,
          createdAt: filters?.createdAt,
        },
      );

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

const buildActivityEntry = (activity: EventActivityRow): ActivityEntry => {
  const base = {
    sourceKey: EventActivitySourceKey.Activity,
    id: activity.id,
    date: activity.createdAt,
    actor: activity.actor,
  };

  /**
   * The target column of the types whose payload names an affected citizen.
   * A citizen that the row does not resolve renders as "Unbekannt".
   */
  const affectedCitizenTarget = (
    <CitizenLink citizen={activity.affectedCitizen} className="truncate" />
  );

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

    case EventActivityType.PARTICIPATION_ADDED_BY_MANAGER: {
      const payload = participantAddedPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: "Teilnehmer hinzugefügt",
        target: affectedCitizenTarget,
        comment: payload.data?.comment ?? null,
      };
    }

    case EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER: {
      const payload = participantRemovedPayloadSchema.safeParse(
        activity.payload,
      );
      return {
        ...base,
        message: "Teilnehmer entfernt",
        target: affectedCitizenTarget,
        comment: payload.data?.reason ?? null,
      };
    }

    case EventActivityType.MANAGER_ADDED:
      return {
        ...base,
        message: "Manager hinzugefügt",
        target: affectedCitizenTarget,
      };

    case EventActivityType.MANAGER_REMOVED:
      return {
        ...base,
        message: "Manager entfernt",
        target: affectedCitizenTarget,
      };

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

    case EventActivityType.PARTICIPATION_TOGGLED: {
      const payload = participationToggledPayloadSchema.safeParse(
        activity.payload,
      );
      if (!payload.success) return { ...base, message: "Teilnahme geändert" };
      if (payload.data.enabled)
        return { ...base, message: "Teilnahme eingeschaltet" };

      const count = payload.data.cancelledParticipantCount;
      return {
        ...base,
        message: `Teilnahme abgeschaltet (${count} ${
          count === 1 ? "Anmeldung" : "Anmeldungen"
        } storniert)`,
      };
    }

    default:
      throw new Error(
        `Unknown activity type: ${activity.type satisfies never}`,
      );
  }
};
