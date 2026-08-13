"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { z } from "zod";
import { createTaskFieldUpdateAction } from "../utils/createTaskFieldUpdateAction";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  rewardTypeTextValue: z.string().trim().max(2048),
});

export const updateTaskRewardTypeTextValue = createTaskFieldUpdateAction(
  "updateTaskRewardTypeTextValue",
  schema,
  {
    update: (data) => ({ rewardTypeTextValue: data.rewardTypeTextValue }),
    auditEvent: (task, data) => ({
      type: AuditEventType.TASK_REWARD_TEXT_UPDATED,
      data: {
        taskId: task.id,
        previousValue: task.rewardTypeTextValue,
        newValue: data.rewardTypeTextValue,
      },
    }),
  },
);
