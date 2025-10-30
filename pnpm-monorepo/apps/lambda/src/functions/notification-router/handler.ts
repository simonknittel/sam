import { z } from "zod";
import "./env";
import { eventCreatedHandler } from "./type-handlers/event_created";
import { eventDeletedHandler } from "./type-handlers/event_deleted";
import { eventUpdatedHandler } from "./type-handlers/event_updated";
import { profitDistributionPayoutDisbursedHandler } from "./type-handlers/profit_distribution_payout_disbursed";
import { profitDistributionPayoutStartedHandler } from "./type-handlers/profit_distribution_payout_started";
import { taskAssignmentUpdatedHandler } from "./type-handlers/task_assignment_updated";
import { taskCreatedHandler } from "./type-handlers/task_created";

export const notificationRouterHandler = async (
  body: z.infer<typeof bodySchema>,
) => {
  switch (body.type) {
    case "EventCreated":
      eventCreatedHandler(body.payload);
      break;
    case "EventUpdated":
      eventUpdatedHandler(body.payload);
      break;
    case "EventDeleted":
      eventDeletedHandler(body.payload);
      break;
    case "TaskCreated":
      taskCreatedHandler(body.payload);
      break;
    case "TaskAssignmentUpdated":
      taskAssignmentUpdatedHandler(body.payload);
      break;
    case "ProfitDistributionPayoutStarted":
      profitDistributionPayoutStartedHandler(body.payload);
      break;
    case "ProfitDistributionPayoutDisbursed":
      profitDistributionPayoutDisbursedHandler(body.payload);
      break;
  }
};

export const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EventCreated"),
    payload: z.object({
      eventId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventUpdated"),
    payload: z.object({
      eventId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventDeleted"),
    payload: z.object({
      eventId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskCreated"),
    payload: z.object({
      taskIds: z.array(z.cuid2()),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskAssignmentUpdated"),
    payload: z.object({
      taskId: z.cuid2(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("ProfitDistributionPayoutStarted"),
    payload: z.object({
      cycleId: z.string(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("ProfitDistributionPayoutDisbursed"),
    payload: z.object({
      cycleId: z.string(),
      changes: z.array(
        z.object({
          citizenId: z.string(),
          attribute: z.string(),
          enabled: z.boolean(),
        }),
      ),
    }),
    requestId: z.cuid2(),
  }),
]);
