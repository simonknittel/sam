"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { z } from "zod";
import { createTaskFieldUpdateAction } from "../utils/createTaskFieldUpdateAction";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  rewardTypeSilcValue: z.coerce.number(),
});

export const updateTaskRewardTypeSilcValue = createTaskFieldUpdateAction(
  "updateTaskRewardTypeSilcValue",
  schema,
  {
    update: (data) => ({ rewardTypeSilcValue: data.rewardTypeSilcValue }),
    auditEvent: (task, data) => ({
      type: AuditEventType.TASK_REWARD_SILC_UPDATED,
      data: {
        taskId: task.id,
        previousValue: task.rewardTypeSilcValue,
        newValue: data.rewardTypeSilcValue,
      },
    }),
  },
);
