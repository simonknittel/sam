"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManageableTask } from "../utils/requireManageableTask";

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
    const { task, failure } = await requireManageableTask(data.id, formData, t);
    if (failure) return failure;

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
