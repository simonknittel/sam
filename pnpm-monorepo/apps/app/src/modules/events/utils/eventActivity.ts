import {
  type EventActivityType,
  type Entity,
  type Event,
  type Prisma,
} from "@sam-monorepo/database/client";

/**
 * Payload shapes of the stored activity types. "Event start"/"event end"
 * entries have no stored type — they are rendered synthetically from the
 * event's startTime/endTime.
 */
export interface EventActivityPayloadByType {
  [EventActivityType.CREATED]: null;
  [EventActivityType.TITLE_UPDATED]: {
    previousName: string;
    newName: string;
  };
  [EventActivityType.DESCRIPTION_UPDATED]: null;
  [EventActivityType.SCHEDULE_UPDATED]: {
    previousStartTime: string;
    newStartTime: string;
    previousEndTime: string | null;
    newEndTime: string | null;
  };
  [EventActivityType.PARTICIPATION_SIGNED_UP]: {
    comment: string | null;
  };
  [EventActivityType.PARTICIPATION_COMMENT_UPDATED]: {
    comment: string | null;
  };
  [EventActivityType.PARTICIPATION_CANCELLED]: null;
  [EventActivityType.LINEUP_TOGGLED]: {
    enabled: boolean;
  };
}

/**
 * Writes one activity entry, typed per activity type. Takes the transaction
 * client so the entry commits atomically with the mutation it records.
 */
export const createEventActivity = <Type extends EventActivityType>(
  client: Prisma.TransactionClient,
  input: {
    readonly eventId: Event["id"];
    readonly citizenId: Entity["id"] | null;
    readonly type: Type;
    readonly payload: EventActivityPayloadByType[Type];
  },
) =>
  client.eventActivity.create({
    data: {
      eventId: input.eventId,
      citizenId: input.citizenId,
      type: input.type,
      ...(input.payload === null ? {} : { payload: input.payload }),
    },
  });
