"use server";

import { prisma } from "@/db";
import { TaskVisibility } from "@/generated/prisma/client";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTaskById } from "../queries/getTaskById";
import { isTaskUpdatable } from "../utils/isTaskUpdatable";

const schema = z.object({
  taskId: z.union([z.cuid(), z.cuid2()]),
});

export const createTaskAssignmentForCurrentUser = createAuthenticatedAction(
  "createTaskAssignmentForCurrentUser",
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

    if (task.assignmentLimit && task.assignments.length >= task.assignmentLimit)
      return {
        error: "Dieser Task kann nicht von Weiteren angenommen werden.",
        requestPayload: formData,
      };

    if (
      task.requiredRoles.length > 0 &&
      !task.requiredRoles.some((role) =>
        authentication.session.entity!.roleAssignments.some(
          (assignment) => assignment.roleId === role.id,
        ),
      )
    )
      return {
        error: "Du erfüllst nicht die Voraussetzungen für diesen Task.",
        requestPayload: formData,
      };

    /**
     * Create
     */
    await prisma.taskAssignment.create({
      data: {
        task: {
          connect: {
            id: data.taskId,
          },
        },
        citizen: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.TASK_SELF_ASSIGNMENT_CREATED,
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
