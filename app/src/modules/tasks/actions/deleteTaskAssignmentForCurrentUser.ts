"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { TaskVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTaskById } from "../queries";
import { isTaskUpdatable } from "../utils/isTaskUpdatable";

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
    if (!isTaskUpdatable(task))
      return {
        error: "Der Task ist bereits abgeschlossen.",
        requestPayload: formData,
      };

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
     * Revalidate cache(s)
     */
    revalidatePath("/app/tasks");
    revalidatePath(`/app/tasks/${task.id}`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
