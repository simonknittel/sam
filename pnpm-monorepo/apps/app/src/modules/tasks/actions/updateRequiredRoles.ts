"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTaskById } from "../queries/getTaskById";
import { isAllowedToManageTask } from "../utils/isAllowedToTask";
import { isTaskUpdatable } from "../utils/isTaskUpdatable";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  requiredRoles: z.array(z.cuid()).max(50), // Arbitrary (untested) limit to prevent DDoS
  hiddenForOtherRoles: z.coerce.boolean(),
});

export const updateRequiredRoles = createAuthenticatedAction(
  "updateRequiredRoles",
  schema,
  async (formData, authentication, data, t) => {
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
    await prisma.task.update({
      where: { id: data.id },
      data: {
        requiredRoles: {
          set: data.requiredRoles.map((roleId) => ({
            id: roleId,
          })),
        },
        hiddenForOtherRoles: data.hiddenForOtherRoles,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.TASK_REQUIRED_ROLES_UPDATED,
        data: {
          taskId: task.id,
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
      success: "Erfolgreich gespeichert.",
    };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      requiredRoles: formData.getAll("requiredRole[]"),
      hiddenForOtherRoles: formData.get("hiddenForOtherRoles")
        ? formData.get("hiddenForOtherRoles")
        : false,
    }),
  },
);
