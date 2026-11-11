import type { ApplicationContext } from "@sam-monorepo/application";
import {
  EVENT_PARTICIPATION_TEXT_MAX_LENGTH,
  EventInvitationAnswer,
  EventParticipationChange,
  LINEUP_MAX_POSITIONS,
  MAXIMUM_POSITION_NAME_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { log } from "../common/logger";
import { BirthdayGreetingHandler } from "./type-handlers/BirthdayGreeting";
import { EventBriefingPublishedHandler } from "./type-handlers/EventBriefingPublished";
import { EventBriefingUpdatedHandler } from "./type-handlers/EventBriefingUpdated";
import { EventCreatedHandler } from "./type-handlers/EventCreated";
import { EventDeletedHandler } from "./type-handlers/EventDeleted";
import { EventInvitationAnsweredHandler } from "./type-handlers/EventInvitationAnswered";
import { EventInvitationCreatedHandler } from "./type-handlers/EventInvitationCreated";
import { EventLineupEnabledHandler } from "./type-handlers/EventLineupEnabled";
import { EventManagerAddedHandler } from "./type-handlers/EventManagerAdded";
import { EventMorningReminderHandler } from "./type-handlers/EventMorningReminder";
import { EventParticipationAddedHandler } from "./type-handlers/EventParticipationAdded";
import { EventParticipationChangedHandler } from "./type-handlers/EventParticipationChanged";
import { EventParticipationRemovedHandler } from "./type-handlers/EventParticipationRemoved";
import { EventPositionApplicationCreatedHandler } from "./type-handlers/EventPositionApplicationCreated";
import { EventPositionAssignedHandler } from "./type-handlers/EventPositionAssigned";
import { EventPositionUnassignedHandler } from "./type-handlers/EventPositionUnassigned";
import { EventPositionVacatedHandler } from "./type-handlers/EventPositionVacated";
import { EventRescheduledHandler } from "./type-handlers/EventRescheduled";
import { EventStartingHandler } from "./type-handlers/EventStarting";
import { EventUpdatedHandler } from "./type-handlers/EventUpdated";
import { FleetUpdateReminderHandler } from "./type-handlers/FleetUpdateReminder";
import { ManualNotificationCreatedHandler } from "./type-handlers/ManualNotificationCreated";
import { NewYearGreetingHandler } from "./type-handlers/NewYearGreeting";
import { PenaltyEntryCreatedHandler } from "./type-handlers/PenaltyEntryCreated";
import { PenaltyEntryDeletedHandler } from "./type-handlers/PenaltyEntryDeleted";
import { PenaltyEntryExpiredHandler } from "./type-handlers/PenaltyEntryExpired";
import { ProfitDistributionPayoutDisbursedHandler } from "./type-handlers/ProfitDistributionPayoutDisbursed";
import { ProfitDistributionPayoutReminderHandler } from "./type-handlers/ProfitDistributionPayoutReminder";
import { ProfitDistributionPayoutStartedHandler } from "./type-handlers/ProfitDistributionPayoutStarted";
import { RoleAddedHandler } from "./type-handlers/RoleAdded";
import { RoleLevelIncreasedHandler } from "./type-handlers/RoleLevelIncreased";
import { SilcTransactionsCreatedHandler } from "./type-handlers/SilcTransactionsCreated";
import { TaskAcceptedHandler } from "./type-handlers/TaskAccepted";
import { TaskAssignmentUpdatedHandler } from "./type-handlers/TaskAssignmentUpdated";
import { TaskCancelledHandler } from "./type-handlers/TaskCancelled";
import { TaskCompletedHandler } from "./type-handlers/TaskCompleted";
import { TaskCreatedHandler } from "./type-handlers/TaskCreated";
import { TaskDeadlineReminderHandler } from "./type-handlers/TaskDeadlineReminder";
import { TaskDeletedHandler } from "./type-handlers/TaskDeleted";
import { WebPushSubscribedHandler } from "./type-handlers/WebPushSubscribed";
import { WelcomeGreetingHandler } from "./type-handlers/WelcomeGreeting";
import { WikiCitizenMentionedHandler } from "./type-handlers/WikiCitizenMentioned";
import { WikiPageReportedHandler } from "./type-handlers/WikiPageReported";

export const notificationRouterHandler = async (
  context: ApplicationContext,
  body: z.infer<typeof bodySchema>,
) => {
  log.info("Routing notification", {
    type: body.type,
    requestId: body.requestId,
  });
  switch (body.type) {
    case "EventCreated":
      await EventCreatedHandler(context, body.payload);
      break;
    case "EventUpdated":
      await EventUpdatedHandler(context, body.payload);
      break;
    case "EventRescheduled":
      await EventRescheduledHandler(context, body.payload);
      break;
    case "EventDeleted":
      await EventDeletedHandler(context, body.payload);
      break;
    case "EventLineupEnabled":
      await EventLineupEnabledHandler(context, body.payload);
      break;
    case "EventPositionAssigned":
      await EventPositionAssignedHandler(context, body.payload);
      break;
    case "EventPositionUnassigned":
      await EventPositionUnassignedHandler(context, body.payload);
      break;
    case "EventBriefingPublished":
      await EventBriefingPublishedHandler(context, body.payload);
      break;
    case "EventBriefingUpdated":
      await EventBriefingUpdatedHandler(context, body.payload);
      break;
    case "EventMorningReminder":
      await EventMorningReminderHandler(context, body.payload);
      break;
    case "EventStarting":
      await EventStartingHandler(context, body.payload);
      break;
    case "EventParticipationAdded":
      await EventParticipationAddedHandler(context, body.payload);
      break;
    case "EventParticipationRemoved":
      await EventParticipationRemovedHandler(context, body.payload);
      break;
    case "EventInvitationCreated":
      await EventInvitationCreatedHandler(context, body.payload);
      break;
    case "EventInvitationAnswered":
      await EventInvitationAnsweredHandler(context, body.payload);
      break;
    case "EventManagerAdded":
      await EventManagerAddedHandler(context, body.payload);
      break;
    case "EventParticipationChanged":
      await EventParticipationChangedHandler(context, body.payload);
      break;
    case "EventPositionVacated":
      await EventPositionVacatedHandler(context, body.payload);
      break;
    case "EventPositionApplicationCreated":
      await EventPositionApplicationCreatedHandler(context, body.payload);
      break;
    case "TaskCreated":
      await TaskCreatedHandler(context, body.payload);
      break;
    case "TaskAssignmentUpdated":
      await TaskAssignmentUpdatedHandler(context, body.payload);
      break;
    case "TaskAccepted":
      await TaskAcceptedHandler(context, body.payload);
      break;
    case "TaskDeadlineReminder":
      await TaskDeadlineReminderHandler(context, body.payload);
      break;
    case "TaskCompleted":
      await TaskCompletedHandler(context, body.payload);
      break;
    case "TaskCancelled":
      await TaskCancelledHandler(context, body.payload);
      break;
    case "TaskDeleted":
      await TaskDeletedHandler(context, body.payload);
      break;
    case "ProfitDistributionPayoutStarted":
      await ProfitDistributionPayoutStartedHandler(context, body.payload);
      break;
    case "ProfitDistributionPayoutReminder":
      await ProfitDistributionPayoutReminderHandler(context, body.payload);
      break;
    case "ProfitDistributionPayoutDisbursed":
      await ProfitDistributionPayoutDisbursedHandler(context, body.payload);
      break;
    case "SilcTransactionsCreated":
      await SilcTransactionsCreatedHandler(context, body.payload);
      break;
    case "RoleAdded":
      await RoleAddedHandler(context, body.payload);
      break;
    case "RoleLevelIncreased":
      await RoleLevelIncreasedHandler(context, body.payload);
      break;
    case "PenaltyEntryCreated":
      await PenaltyEntryCreatedHandler(context, body.payload);
      break;
    case "PenaltyEntryExpired":
      await PenaltyEntryExpiredHandler(context, body.payload);
      break;
    case "PenaltyEntryDeleted":
      await PenaltyEntryDeletedHandler(context, body.payload);
      break;
    case "WebPushSubscribed":
      await WebPushSubscribedHandler(context, body.payload);
      break;
    case "WikiPageReported":
      await WikiPageReportedHandler(context, body.payload);
      break;
    case "WikiCitizenMentioned":
      await WikiCitizenMentionedHandler(context, body.payload);
      break;
    case "BirthdayGreeting":
      await BirthdayGreetingHandler(context, body.payload);
      break;
    case "NewYearGreeting":
      await NewYearGreetingHandler(context, body.payload);
      break;
    case "WelcomeGreeting":
      await WelcomeGreetingHandler(context, body.payload);
      break;
    case "FleetUpdateReminder":
      await FleetUpdateReminderHandler(context, body.payload);
      break;
    case "ManualNotificationCreated":
      await ManualNotificationCreatedHandler(context, body.payload);
      break;
    default:
      throw new Error(`Unknown notification type: ${body satisfies never}`);
  }
};

/**
 * Not a limit of the transport: EventBridge and SQS accept events of up to
 * 1 MB, which is space for more IDs than this limit. One event of the app or
 * of the salary payout has far fewer items: for example, the salary payout
 * sends one ID for each paid booking of the day, thus at most one ID for each
 * citizen and role with a salary on that day. The limit only stops the loops
 * over a malformed event.
 * An event with more items fails the validation: SQS delivers it again, then
 * it moves the event to the dead-letter queue, and nobody gets its
 * notifications.
 */
const MAXIMUM_EVENT_ITEM_COUNT = 10_000;

export const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EventCreated"),
    payload: z.object({
      eventId: z.cuid(),
      /**
       * The citizen who caused the notification gets none. Null when no
       * citizen caused it, for example the Discord sync. An older app does
       * not send it.
       */
      actorCitizenId: z.cuid().nullable().optional(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventUpdated"),
    payload: z.object({
      eventId: z.cuid(),
      /**
       * The citizen who caused the notification gets none. Null when no
       * citizen caused it, for example the Discord sync. An older app does
       * not send it.
       */
      actorCitizenId: z.cuid().nullable().optional(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventRescheduled"),
    payload: z.object({
      eventId: z.cuid(),
      /**
       * The citizen who caused the notification gets none. Null when no
       * citizen caused it, for example the Discord sync.
       */
      actorCitizenId: z.cuid().nullable(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventDeleted"),
    payload: z.object({
      eventId: z.cuid(),
      /**
       * The citizen who caused the notification gets none. Null when no
       * citizen caused it, for example the Discord sync. An older app does
       * not send it.
       */
      actorCitizenId: z.cuid().nullable().optional(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventLineupEnabled"),
    payload: z.object({
      eventId: z.cuid(),
      /**
       * The citizen who caused the notification gets none. Null when no
       * citizen caused it, for example the Discord sync. An older app does
       * not send it.
       */
      actorCitizenId: z.cuid().nullable().optional(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventPositionAssigned"),
    payload: z.object({
      positionId: z.cuid(),
      citizenId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventPositionUnassigned"),
    // The position can be deleted, thus the payload carries its name
    payload: z.object({
      eventId: z.cuid(),
      citizenId: z.cuid(),
      /** Null when the change deleted the position */
      positionId: z.cuid().nullable(),
      positionName: z.string().max(MAXIMUM_POSITION_NAME_LENGTH),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventMorningReminder"),
    payload: z.object({
      eventId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventStarting"),
    payload: z.object({
      eventId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventParticipationAdded"),
    payload: z.object({
      eventId: z.cuid(),
      citizenId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventParticipationRemoved"),
    payload: z.object({
      eventId: z.cuid(),
      citizenId: z.cuid(),
      reason: z.string().max(500).nullable(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventInvitationCreated"),
    payload: z.object({
      invitationId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventInvitationAnswered"),
    payload: z.object({
      eventId: z.cuid(),
      citizenId: z.cuid(),
      answer: z.enum(EventInvitationAnswer),
      comment: z.string().max(EVENT_PARTICIPATION_TEXT_MAX_LENGTH).nullable(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventManagerAdded"),
    payload: z.object({
      eventId: z.cuid(),
      citizenId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventParticipationChanged"),
    payload: z.object({
      eventId: z.cuid(),
      citizenId: z.cuid(),
      change: z.enum(EventParticipationChange),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventPositionVacated"),
    // The cancellation removed the citizen from the positions, thus the
    // payload carries their names
    payload: z.object({
      eventId: z.cuid(),
      citizenId: z.cuid(),
      positionNames: z
        .array(z.string().max(MAXIMUM_POSITION_NAME_LENGTH))
        .max(LINEUP_MAX_POSITIONS),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventPositionApplicationCreated"),
    payload: z.object({
      applicationId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventBriefingPublished"),
    // The router reads the current read scope from the database, thus the
    // schema drops a read scope in the payload
    payload: z.object({
      eventId: z.cuid(),
      /**
       * The citizen who caused the notification gets none. Null when no
       * citizen caused it, for example the Discord sync. An older app does
       * not send it.
       */
      actorCitizenId: z.cuid().nullable().optional(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventBriefingUpdated"),
    payload: z.object({
      eventId: z.cuid(),
      /** The citizen who caused the notification gets none */
      actorCitizenId: z.cuid().nullable(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskCreated"),
    payload: z.object({
      taskIds: z.array(z.cuid()).max(MAXIMUM_EVENT_ITEM_COUNT),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskAssignmentUpdated"),
    payload: z.object({
      taskId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskDeleted"),
    payload: z.object({
      taskId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskAccepted"),
    payload: z.object({
      taskId: z.cuid(),
      citizenId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskDeadlineReminder"),
    payload: z.object({
      taskId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskCompleted"),
    payload: z.object({
      taskId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskCancelled"),
    payload: z.object({
      taskId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("ProfitDistributionPayoutStarted"),
    payload: z.object({
      cycleId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("ProfitDistributionPayoutReminder"),
    payload: z.object({
      cycleId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("ProfitDistributionPayoutDisbursed"),
    payload: z.object({
      cycleId: z.string(),
      changes: z
        .array(
          z.object({
            citizenId: z.string(),
            attribute: z.string(),
            enabled: z.boolean(),
          }),
        )
        .max(MAXIMUM_EVENT_ITEM_COUNT),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("SilcTransactionsCreated"),
    payload: z.object({
      transactionIds: z.array(z.cuid()).max(MAXIMUM_EVENT_ITEM_COUNT),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("RoleAdded"),
    payload: z.object({
      citizenId: z.cuid(),
      roleId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("RoleLevelIncreased"),
    payload: z.object({
      citizenId: z.cuid(),
      roleId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("PenaltyEntryCreated"),
    payload: z.object({
      penaltyEntryId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("PenaltyEntryExpired"),
    payload: z.object({
      penaltyEntryId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("PenaltyEntryDeleted"),
    payload: z.object({
      penaltyEntryId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("WebPushSubscribed"),
    payload: z.object({
      subscriptionId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("WikiPageReported"),
    payload: z.object({
      reportId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("WikiCitizenMentioned"),
    payload: z.object({
      mentionId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("BirthdayGreeting"),
    payload: z.object({
      citizenId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("NewYearGreeting"),
    payload: z.object({
      citizenId: z.cuid(),
      /**
       * The calendar year the citizen just entered in their own time zone.
       * Four digits, which is what the wordings are written and measured
       * against — see their unit test.
       */
      year: z.int().positive().max(9999),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("WelcomeGreeting"),
    payload: z.object({
      citizenId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("FleetUpdateReminder"),
    payload: z.object({
      citizenId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("ManualNotificationCreated"),
    payload: z.object({
      manualNotificationId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),
]);
