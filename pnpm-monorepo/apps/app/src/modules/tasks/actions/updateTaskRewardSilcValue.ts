"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { TaskRewardType } from "@sam-monorepo/database/client";
import * as z from "zod";
import { createTaskFieldUpdateAction } from "../utils/createTaskFieldUpdateAction";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  rewardSilcValue: z.coerce.number().int().min(1),
});

export const updateTaskRewardSilcValue = createTaskFieldUpdateAction(
  "updateTaskRewardSilcValue",
  schema,
  {
    update: (data) => ({ rewardSilcValue: data.rewardSilcValue }),
    /**
     * The system log keeps one event type for each SILC reward type, because
     * it had one value column for each type before
     */
    auditEvent: (task, data) => {
      const payload = {
        taskId: task.id,
        previousValue: task.rewardSilcValue,
        newValue: data.rewardSilcValue,
      };

      switch (task.rewardType) {
        case TaskRewardType.SILC:
          return {
            type: AuditEventType.TASK_REWARD_SILC_UPDATED,
            data: payload,
          };

        case TaskRewardType.NEW_SILC:
          return {
            type: AuditEventType.TASK_REWARD_NEW_SILC_UPDATED,
            data: payload,
          };

        /**
         * The reward CHECK constraint refuses a SILC value on a text reward,
         * thus the update fails before this event
         */
        case TaskRewardType.TEXT:
          throw new Error(`Task ${task.id} has no SILC reward`);

        default:
          throw new Error(
            `Unknown task reward type: ${task.rewardType satisfies never}`,
          );
      }
    },
  },
);
