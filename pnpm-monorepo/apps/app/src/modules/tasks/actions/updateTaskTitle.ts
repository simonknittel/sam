"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { z } from "zod";
import { createTaskFieldUpdateAction } from "../utils/createTaskFieldUpdateAction";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  title: z.string().trim().max(64),
});

export const updateTaskTitle = createTaskFieldUpdateAction(
  "updateTaskTitle",
  schema,
  {
    update: (data) => ({ title: data.title }),
    auditEvent: (task, data) => ({
      type: AuditEventType.TASK_TITLE_UPDATED,
      data: {
        taskId: task.id,
        previousTitle: task.title,
        newTitle: data.title,
      },
    }),
  },
);
