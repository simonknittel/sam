"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { TaskVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTaskById } from "../queries";
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
