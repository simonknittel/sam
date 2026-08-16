import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  EventActivityType,
  type Entity,
  type Event,
  type EventActivity,
} from "@sam-monorepo/database/client";
import clsx from "clsx";
import type { ReactNode } from "react";
import { z } from "zod";
import { getEventActivities } from "../queries/getEventActivities";

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

interface FeedEntry {
  readonly key: string;
  readonly timestamp: Date;
  readonly citizen: Entity | null;
  readonly message: ReactNode;
  readonly comment?: string | null;
}

const buildFeedEntry = (
  activity: EventActivity & { citizen: Entity | null },
): FeedEntry => {
  const base = {
    key: activity.id,
    timestamp: activity.createdAt,
    citizen: activity.citizen,
  };

  switch (activity.type) {
    case EventActivityType.CREATED:
      return { ...base, message: "hat das Event erstellt" };

    case EventActivityType.TITLE_UPDATED: {
      const payload = titleUpdatedPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: payload.success ? (
          <>
            hat den Titel von{" "}
            <span className="font-bold">{payload.data.previousName}</span> zu{" "}
            <span className="font-bold">{payload.data.newName}</span> geändert
          </>
        ) : (
          "hat den Titel geändert"
        ),
      };
    }

    case EventActivityType.DESCRIPTION_UPDATED:
      return { ...base, message: "hat die Beschreibung aktualisiert" };

    case EventActivityType.SCHEDULE_UPDATED: {
      const payload = scheduleUpdatedPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: payload.success ? (
          <>
            hat den Zeitraum geändert: {formatDate(payload.data.newStartTime)}{" "}
            bis {formatDate(payload.data.newEndTime) || "-"}
          </>
        ) : (
          "hat den Zeitraum geändert"
        ),
      };
    }

    case EventActivityType.PARTICIPATION_SIGNED_UP: {
      const payload = commentPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: "hat sich angemeldet",
        comment: payload.success ? payload.data.comment : null,
      };
    }

    case EventActivityType.PARTICIPATION_COMMENT_UPDATED: {
      const payload = commentPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message: "hat den Kommentar aktualisiert",
        comment: payload.success ? payload.data.comment : null,
      };
    }

    case EventActivityType.PARTICIPATION_CANCELLED:
      return { ...base, message: "hat sich abgemeldet" };

    case EventActivityType.LINEUP_TOGGLED: {
      const payload = lineupToggledPayloadSchema.safeParse(activity.payload);
      return {
        ...base,
        message:
          payload.success && !payload.data.enabled
            ? "hat die Aufstellung zurückgezogen"
            : "hat die Aufstellung veröffentlicht",
      };
    }

    default:
      throw new Error(
        `Unknown activity type: ${activity.type satisfies never}`,
      );
  }
};

interface Props {
  readonly className?: string;
  readonly event: Event;
}

export const ActivityTab = async ({ className, event }: Props) => {
  const activities = await getEventActivities(event.id);
  const now = new Date();

  const entries = activities.map(buildFeedEntry);

  /**
   * "Event start"/"event end" are rendered synthetically from the event's
   * times instead of being stored — no cron job needed.
   */
  if (event.startTime <= now) {
    entries.push({
      key: "synthetic-start",
      timestamp: event.startTime,
      citizen: null,
      message: "Das Event hat begonnen",
    });
  }
  if (event.endTime && event.endTime <= now) {
    entries.push({
      key: "synthetic-end",
      timestamp: event.endTime,
      citizen: null,
      message: "Das Event ist zu Ende",
    });
  }

  const sortedEntries = entries.toSorted(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );

  return (
    <section
      className={clsx("rounded-primary bg-neutral-800/50 p-4", className)}
    >
      <h2 className="font-bold mb-4 text-lg font-mono uppercase">Aktivität</h2>

      {sortedEntries.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {sortedEntries.map((entry) => (
            <li key={entry.key} className="flex flex-col">
              <p className="flex items-baseline gap-2 flex-wrap">
                {entry.citizen ? (
                  <>
                    <CitizenLink citizen={entry.citizen} />
                    <span>{entry.message}</span>
                  </>
                ) : (
                  <span>{entry.message}</span>
                )}
              </p>

              {entry.comment && (
                <p className="text-sm text-neutral-300 border-l-2 border-neutral-700 pl-2 mt-1">
                  {entry.comment}
                </p>
              )}

              <time className="text-xs text-neutral-500 mt-1">
                {formatDate(entry.timestamp, "long")}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500">Bisher gibt es keine Aktivität.</p>
      )}
    </section>
  );
};
