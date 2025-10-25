import { withTrace } from "@/modules/tracing/utils/withTrace";
import ProfitDistributionPayoutDisbursed from "./events/profit_distribution_payout_disbursed";
import ProfitDistributionPayoutStarted from "./events/profit_distribution_payout_started";
import TaskAssignmentUpdated from "./events/task_assignment_updated";
import TaskCreated from "./events/task_created";

export const Events = {
  [ProfitDistributionPayoutStarted.key]:
    ProfitDistributionPayoutStarted.handler,
  [ProfitDistributionPayoutDisbursed.key]:
    ProfitDistributionPayoutDisbursed.handler,
  [TaskAssignmentUpdated.key]: TaskAssignmentUpdated.handler,
  [TaskCreated.key]: TaskCreated.handler,
} as const;

export const triggerNotification = withTrace(
  "triggerNotification",
  async <T extends keyof typeof Events>(
    key: T,
    payload: Parameters<(typeof Events)[T]>[0],
  ) => {
    // @ts-expect-error Don't know how to improve this typing
    await Events[key](payload);
  },
);
