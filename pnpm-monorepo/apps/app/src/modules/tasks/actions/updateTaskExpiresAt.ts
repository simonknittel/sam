"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { z } from "zod";
import { createTaskFieldUpdateAction } from "../utils/createTaskFieldUpdateAction";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  expiresAt: z.coerce.date().nullable(),
});

export const updateTaskExpiresAt = createTaskFieldUpdateAction(
  "updateTaskExpiresAt",
  schema,
  {
    update: (data) => ({ expiresAt: data.expiresAt }),
    auditEvent: (task, data) => ({
      type: AuditEventType.TASK_EXPIRES_AT_UPDATED,
      data: {
        taskId: task.id,
        previousExpiresAt: task.expiresAt,
        newExpiresAt: data.expiresAt,
      },
    }),
    parseFormData: (formData) => ({
      id: formData.get("id"),
      expiresAt:
        formData.get("expiresAt") && formData.get("expiresAt") !== ""
          ? formData.get("expiresAt")
          : null,
    }),
  },
);
