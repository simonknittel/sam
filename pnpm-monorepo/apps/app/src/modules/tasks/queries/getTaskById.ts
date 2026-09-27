import { prisma } from "@/db";
import {
  getEffectiveRoles,
  requireAuthentication,
} from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Task } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getVisibleTasksWhere } from "./getVisibleTasksWhere";

export const getTaskById = cache(
  withTrace("getTaskById", async (id: Task["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("task", "read"))) forbidden();
    if (!authentication.session.entity) forbidden();

    const task = await prisma.task.findFirst({
      where: {
        AND: [{ id, deletedAt: null }, await getVisibleTasksWhere()],
      },
      include: {
        assignments: {
          select: {
            id: true,
            citizenId: true,
            citizen: { select: { id: true, handle: true, deletedAt: true } },
          },
        },
        requiredRoles: { select: { id: true } },
        completionists: { select: { id: true, handle: true, deletedAt: true } },
        createdBy: { select: { id: true, handle: true, deletedAt: true } },
      },
    });
    if (!task) return null;

    const { roleIds } = await getEffectiveRoles(
      authentication.session.entity.id,
    );

    return {
      ...task,
      /**
       * The role rule of the self-assignment, with the effective roles of the
       * viewer (see `getVisibleTasksWhere`). The effective roles are not in
       * the session, thus the task page and the action read the result here.
       */
      hasCurrentUserRequiredRole:
        task.requiredRoles.length === 0 ||
        task.requiredRoles.some((role) => roleIds.has(role.id)),
    };
  }),
);
