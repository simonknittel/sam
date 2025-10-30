"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { getTaskById } from "../queries";
import { isAllowedToManageTask } from "../utils/isAllowedToTask";
import { isTaskUpdatable } from "../utils/isTaskUpdatable";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  assignmentLimit: z.coerce.number().min(1).nullable(),
  assignedToIds: z.array(z.cuid()).max(250).optional(), // Arbitrary (untested) limit to prevent DDoS
});

export const updateTaskAssignments = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction(
      "updateTaskAssignments",
    );
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      id: formData.get("id"),
      assignmentLimit:
        formData.has("assignmentLimit") &&
          formData.get("assignmentLimit") !== ""
          ? formData.get("assignmentLimit")
          : null,
      assignedToIds: formData.has("assignedToId[]")
        ? formData.getAll("assignedToId[]")
        : undefined,
    });
    if (!result.success)
      return {
        error: t("Common.badRequest"),
        errorDetails: result.error,
        requestPayload: formData,
      };

    /**
     * Authorize the request
     */
    const task = await getTaskById(result.data.id);
    if (!task)
      return { error: "Task nicht gefunden", requestPayload: formData };
    if (!isTaskUpdatable(task))
      return {
        error: "Der Task ist bereits abgeschlossen.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManageTask(task)))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update task
     */
    const assignmentsToDelete = task.assignments.filter(
      (assignment) =>
        !result.data.assignedToIds?.includes(assignment.citizenId),
    );
    const assignmentsToCreate =
      result.data.assignedToIds?.filter(
        (assignedToId) =>
          !task.assignments
            .map((assignment) => assignment.citizenId)
            .includes(assignedToId),
      ) || [];
    await prisma.task.update({
      where: { id: result.data.id },
      data: {
        assignmentLimit: result.data.assignmentLimit,
        assignments: {
          deleteMany: {
            citizenId: {
              in: assignmentsToDelete.map((assignment) => assignment.citizenId),
            },
          },
          createMany: {
            data: assignmentsToCreate?.map((assignedToId) => ({
              citizenId: assignedToId,
            })),
          },
        },
      },
    });

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "TaskAssignmentUpdated",
        payload: {
          taskId: result.data.id,
        },
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
      success: "Erfolgreich gespeichert.",
    };
  } catch (error) {
    unstable_rethrow(error);
    void log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
