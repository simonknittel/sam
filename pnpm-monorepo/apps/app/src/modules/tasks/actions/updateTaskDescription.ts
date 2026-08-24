"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { z } from "zod";
import { createTaskFieldUpdateAction } from "../utils/createTaskFieldUpdateAction";
import { TASK_DESCRIPTION_MAX_LENGTH } from "../utils/taskConstraints";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  description: z.string().trim().max(TASK_DESCRIPTION_MAX_LENGTH),
});

export const updateTaskDescription = createTaskFieldUpdateAction(
  "updateTaskDescription",
  schema,
  {
    update: (data) => ({ description: data.description }),
    auditEvent: (task, data) => ({
      type: AuditEventType.TASK_DESCRIPTION_UPDATED,
      data: {
        taskId: task.id,
        previousDescription: task.description,
        newDescription: data.description,
      },
    }),
  },
);
