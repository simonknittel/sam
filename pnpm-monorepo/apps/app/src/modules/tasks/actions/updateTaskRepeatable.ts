"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { z } from "zod";
import { createTaskFieldUpdateAction } from "../utils/createTaskFieldUpdateAction";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  repeatable: z.coerce.number().min(1),
});

export const updateTaskRepeatable = createTaskFieldUpdateAction(
  "updateTaskRepeatable",
  schema,
  {
    update: (data) => ({ repeatable: data.repeatable }),
    auditEvent: (task, data) => ({
      type: AuditEventType.TASK_REPEATABLE_UPDATED,
      data: {
        taskId: task.id,
        previousRepeatable: task.repeatable,
        newRepeatable: data.repeatable,
      },
    }),
  },
);
