import { z } from "zod";
import "./env";
import { EventCreatedHandler } from "./type-handlers/EventCreated";
import { EventDeletedHandler } from "./type-handlers/EventDeleted";
import { EventUpdatedHandler } from "./type-handlers/EventUpdated";
import { ProfitDistributionPayoutDisbursedHandler } from "./type-handlers/ProfitDistributionPayoutDisbursed";
import { ProfitDistributionPayoutStartedHandler } from "./type-handlers/ProfitDistributionPayoutStarted";
import { RoleAddedHandler } from "./type-handlers/RoleAdded";
import { SilcTransactionsCreatedHandler } from "./type-handlers/SilcTransactionsCreated";
import { TaskAssignmentUpdatedHandler } from "./type-handlers/TaskAssignmentUpdated";
import { TaskCreatedHandler } from "./type-handlers/TaskCreated";

export const notificationRouterHandler = async (
  body: z.infer<typeof bodySchema>,
) => {
  switch (body.type) {
    case "EventCreated":
      await EventCreatedHandler(body.payload);
      break;
    case "EventUpdated":
      await EventUpdatedHandler(body.payload);
      break;
    case "EventDeleted":
      await EventDeletedHandler(body.payload);
      break;
    case "TaskCreated":
      await TaskCreatedHandler(body.payload);
      break;
    case "TaskAssignmentUpdated":
      await TaskAssignmentUpdatedHandler(body.payload);
      break;
    case "ProfitDistributionPayoutStarted":
      await ProfitDistributionPayoutStartedHandler(body.payload);
      break;
    case "ProfitDistributionPayoutDisbursed":
      await ProfitDistributionPayoutDisbursedHandler(body.payload);
      break;
    case "SilcTransactionsCreated":
      await SilcTransactionsCreatedHandler(body.payload);
      break;
    case "RoleAdded":
      await RoleAddedHandler(body.payload);
      break;
  }
};

export const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EventCreated"),
    payload: z.object({
      eventId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventUpdated"),
    payload: z.object({
      eventId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("EventDeleted"),
    payload: z.object({
      eventId: z.cuid(),
    }),
    requestId: z.cuid2(),
  }),

  z.object({
    type: z.literal("TaskCreated"),
    payload: z.object({
      taskIds: z.array(z.cuid()),
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
    type: z.literal("ProfitDistributionPayoutStarted"),
    payload: z.object({
      cycleId: z.cuid2(),
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

  z.object({
    type: z.literal("SilcTransactionsCreated"),
    payload: z.object({
      transactionIds: z.array(z.cuid()),
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
]);
