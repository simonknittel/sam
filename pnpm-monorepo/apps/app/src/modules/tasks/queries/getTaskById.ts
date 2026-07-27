import { prisma } from "@/db";
import type { Task } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
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
          include: {
            citizen: true,
          },
        },
        requiredRoles: {
          include: {
            icon: true,
          },
        },
        completionists: true,
        createdBy: true,
      },
    });

    if (!task) return null;

    if (!(await isVisibleForCurrentUser(task))) return null;

    return task;
  }),
);
