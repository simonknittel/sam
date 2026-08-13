"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { z } from "zod";
import { createTaskFieldUpdateAction } from "../utils/createTaskFieldUpdateAction";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  rewardTypeNewSilcValue: z.coerce.number(),
});

export const updateTaskRewardTypeNewSilcValue = createTaskFieldUpdateAction(
  "updateTaskRewardTypeNewSilcValue",
  schema,
  {
    update: (data) => ({ rewardTypeNewSilcValue: data.rewardTypeNewSilcValue }),
    auditEvent: (task, data) => ({
      type: AuditEventType.TASK_REWARD_NEW_SILC_UPDATED,
      data: {
        taskId: task.id,
        previousValue: task.rewardTypeNewSilcValue,
        newValue: data.rewardTypeNewSilcValue,
      },
    }),
  },
);
