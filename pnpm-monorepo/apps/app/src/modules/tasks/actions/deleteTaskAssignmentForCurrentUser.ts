"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { TaskVisibility } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { requireOpenTask } from "../utils/requireOpenTask";

const schema = z.object({
  taskId: z.union([z.cuid(), z.cuid2()]),
});

export const deleteTaskAssignmentForCurrentUser = createAuthenticatedAction(
  "deleteTaskAssignmentForCurrentUser",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const { task, failure } = await requireOpenTask(data.taskId, formData);
    if (failure) return failure;

    if (
      task.visibility === TaskVisibility.PERSONALIZED ||
      task.visibility === TaskVisibility.GROUP
    )
      return {
        error:
          "Du kannst deine Teilnahme an einem personalisierten Task nicht selbstständig ändern.",
        requestPayload: formData,
      };

    /**
     * Delete
     */
    const { count } = await prisma.taskAssignment.deleteMany({
      where: {
        taskId: data.taskId,
        citizenId: authentication.session.entity.id,
      },
    });

    /**
     * Also when a different tab gave the task up before: the page then shows
     * the current state
     */
    refresh();

    if (count === 0)
      return {
        error: "Du hast diesen Task nicht angenommen.",
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.TASK_SELF_ASSIGNMENT_DELETED,
        data: {
          taskId: task.id,
          citizenId: authentication.session.entity.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
