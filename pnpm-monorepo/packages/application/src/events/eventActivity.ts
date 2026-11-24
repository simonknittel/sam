import type {
  Citizen,
  Event,
  EventActivityType,
  Prisma,
} from "@sam-monorepo/database/client";

/**
 * The "event start" and "event end" entries have no stored type: the app
 * renders them from the startTime and the endTime of the event
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
   * The changes by a manager: the row's citizen column holds the acting
   * manager, so the affected citizen goes into the payload. The managers, the
   * invitations and the applications follow the same convention.
   */
  [EventActivityType.PARTICIPATION_ADDED_BY_MANAGER]: {
    citizenId: string;
    comment: string | null;
  };
  [EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER]: {
    citizenId: string;
    reason: string | null;
  };
  [EventActivityType.MANAGER_ADDED]: {
    citizenId: string;
  };
  [EventActivityType.MANAGER_REMOVED]: {
    citizenId: string;
  };
  [EventActivityType.LINEUP_TOGGLED]: {
    enabled: boolean;
  };
  [EventActivityType.PARTICIPATION_TOGGLED]: {
    enabled: boolean;
    cancelledParticipantCount: number;
  };
  [EventActivityType.INVITATION_CREATED]: {
    citizenId: string;
    message: string | null;
  };
  [EventActivityType.INVITATION_ACCEPTED]: {
    comment: string | null;
  };
  [EventActivityType.INVITATION_DECLINED]: {
    comment: string | null;
  };
  [EventActivityType.INVITATION_WITHDRAWN]: {
    citizenId: string;
  };
  [EventActivityType.APPLICATION_CREATED]: {
    comment: string | null;
  };
  /**
   * The row's citizen column holds the manager, or the applicant who withdrew
   * the own application
   */
  [EventActivityType.APPLICATION_APPROVED]: {
    citizenId: string;
  };
  [EventActivityType.APPLICATION_DECLINED]: {
    citizenId: string;
    reason: string | null;
  };
  [EventActivityType.APPLICATION_WITHDRAWN]: {
    citizenId: string;
  };
  [EventActivityType.APPLICATION_REQUIREMENT_TOGGLED]: {
    enabled: boolean;
    approvedApplicationCount: number;
  };
}

/**
 * Takes the transaction client so the entry commits atomically with the
 * mutation it records
 */
export const createEventActivity = <Type extends EventActivityType>(
  client: Prisma.TransactionClient,
  input: {
    readonly eventId: Event["id"];
    readonly citizenId: Citizen["id"] | null;
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
