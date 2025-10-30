import { z } from "zod";
import "./env";
import { eventCreatedHandler } from "./type-handlers/EventCreated";
import { eventDeletedHandler } from "./type-handlers/EventDeleted";
import { eventUpdatedHandler } from "./type-handlers/EventUpdated";
import { profitDistributionPayoutDisbursedHandler } from "./type-handlers/ProfitDistributionPayoutDisbursed";
import { profitDistributionPayoutStartedHandler } from "./type-handlers/ProfitDistributionPayoutStarted";
import { taskAssignmentUpdatedHandler } from "./type-handlers/task_assignment_updated";
import { taskCreatedHandler } from "./type-handlers/task_created";

export const notificationRouterHandler = async (
  body: z.infer<typeof bodySchema>,
) => {
  switch (body.type) {
    case "EventCreated":
      await eventCreatedHandler(body.payload);
      break;
    case "EventUpdated":
      await eventUpdatedHandler(body.payload);
      break;
    case "EventDeleted":
      await eventDeletedHandler(body.payload);
      break;
    case "TaskCreated":
      await taskCreatedHandler(body.payload);
      break;
    case "TaskAssignmentUpdated":
      await taskAssignmentUpdatedHandler(body.payload);
      break;
    case "ProfitDistributionPayoutStarted":
      await profitDistributionPayoutStartedHandler(body.payload);
      break;
    case "ProfitDistributionPayoutDisbursed":
      await profitDistributionPayoutDisbursedHandler(body.payload);
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
