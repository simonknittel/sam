"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { TaskVisibility } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { getTaskById } from "../queries/getTaskById";
import { rejectClosedTask } from "../utils/rejectClosedTask";

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

    const task = await getTaskById(data.taskId);
    if (!task)
      return { error: "Task nicht gefunden", requestPayload: formData };
    const closedTaskFailure = rejectClosedTask(task, formData);
    if (closedTaskFailure) return closedTaskFailure;

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
    await prisma.taskAssignment.delete({
      where: {
        taskId_citizenId: {
          taskId: data.taskId,
          citizenId: authentication.session.entity.id,
        },
      },
    });

    refresh();

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
