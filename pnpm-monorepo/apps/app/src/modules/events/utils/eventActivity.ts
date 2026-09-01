import {
  type Entity,
  type Event,
  type EventActivityType,
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
  /**
   * Manager-driven participation changes: the row's own citizen column holds
   * the acting manager, so the affected citizen goes into the payload.
   */
  [EventActivityType.PARTICIPATION_ADDED_BY_MANAGER]: {
    citizenId: string;
    comment: string | null;
  };
  [EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER]: {
    citizenId: string;
    reason: string | null;
  };
  /**
   * Manager assignments follow the same convention: the row's citizen column
   * holds the acting manager, the payload the manager who was added or
   * removed.
   */
  [EventActivityType.MANAGER_ADDED]: {
    citizenId: string;
  };
  [EventActivityType.MANAGER_REMOVED]: {
    citizenId: string;
  };
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
