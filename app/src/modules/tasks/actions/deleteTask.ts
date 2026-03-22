"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTaskById } from "../queries";
import {
  isAllowedToDeleteTask,
  isAllowedToManageTask,
} from "../utils/isAllowedToTask";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
});

export const deleteTask = createAuthenticatedAction(
  "deleteTask",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity || !(await isAllowedToDeleteTask()))
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
    if (!(await isAllowedToManageTask(task)))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Delete position
     */
    await prisma.task.update({
      where: {
        id: data.id,
      },
      data: {
        deletedAt: new Date(),
        deletedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.TASK_DELETED,
        data: {
          taskId: task.id,
          title: task.title,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    redirect("/app/tasks");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
