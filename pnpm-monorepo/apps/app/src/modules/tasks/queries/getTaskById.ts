import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Task } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { isVisibleForCurrentUser } from "../utils/isVisibleForCurrentUser";

export const getTaskById = cache(
  withTrace("getTaskById", async (id: Task["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("task", "read"))) forbidden();

    const task = await prisma.task.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        assignments: {
          select: {
            id: true,
            citizenId: true,
            citizen: { select: { id: true, handle: true } },
          },
        },
        requiredRoles: { select: { id: true } },
        completionists: { select: { id: true, handle: true } },
        createdBy: { select: { id: true, handle: true } },
      },
    });

    if (!task) return null;

    if (!(await isVisibleForCurrentUser(task))) return null;

    return task;
  }),
);
