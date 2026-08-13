"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTaskById } from "../queries/getTaskById";
import { isAllowedToManageTask } from "../utils/isAllowedToTask";
import { isTaskUpdatable } from "../utils/isTaskUpdatable";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  assignmentLimit: z.coerce.number().min(1).nullable(),
  assignedToIds: z.array(z.cuid()).max(250).optional(), // Arbitrary (untested) limit to prevent DDoS
});

export const updateTaskAssignments = createAuthenticatedAction(
  "updateTaskAssignments",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Authorize the request
     */
    const task = await getTaskById(data.id);
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
      (assignment) => !data.assignedToIds?.includes(assignment.citizenId),
    );
    const assignmentsToCreate =
      data.assignedToIds?.filter(
        (assignedToId) =>
          !task.assignments
            .map((assignment) => assignment.citizenId)
            .includes(assignedToId),
      ) || [];
    await prisma.task.update({
      where: { id: data.id },
      data: {
        assignmentLimit: data.assignmentLimit,
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

    await createAuditEvents([
      {
        type: AuditEventType.TASK_ASSIGNMENTS_UPDATED,
        data: {
          taskId: data.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "TaskAssignmentUpdated",
        payload: {
          taskId: data.id,
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
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      assignmentLimit:
        formData.has("assignmentLimit") &&
        formData.get("assignmentLimit") !== ""
          ? formData.get("assignmentLimit")
          : null,
      assignedToIds: formData.has("assignedToId[]")
        ? formData.getAll("assignedToId[]")
        : undefined,
    }),
  },
);
