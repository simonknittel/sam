"use server";

import { createTaskUpdateAction } from "../utils/createTaskUpdateAction";

export const updateTaskExpiresAt = createTaskUpdateAction(
  "updateTaskExpiresAt",
  {
    parseFormData: (formData) => ({
      task_id: formData.get("id"),
      expires_at: formData.get("expiresAt") || null,
    }),
  },
);
