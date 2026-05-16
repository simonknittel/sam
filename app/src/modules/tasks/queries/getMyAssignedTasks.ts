import { prisma } from "@/db";
import type {
  Entity,
  Role,
  Task,
  TaskAssignment,
} from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

const isVisibleForCurrentUser = async (
  task: Task & {
    assignments: Pick<TaskAssignment, "citizenId">[];
    completionists?: Pick<Entity, "id">[];
    requiredRoles: Pick<Role, "id">[];
  },
) => {
  const authentication = await requireAuthentication();
  if (!authentication.session.entity) throw new Error("Unauthorized");

  if (await authentication.authorize("task", "manage")) return true;

  if (task.createdById === authentication.session.entity.id) return true;

  if (
    task.completionists?.some(
      (completionist) => completionist.id === authentication.session.entity!.id,
    )
  )
    return true;

  if (
    task.assignments.some(
      (assignment) =>
        assignment.citizenId === authentication.session.entity!.id,
    )
  )
    return true;

  if (task.requiredRoles.length > 0 && task.hiddenForOtherRoles) {
    return task.requiredRoles.some((role) =>
      authentication.session.entity!.roleAssignments.some(
        (assignment) => assignment.roleId === role.id,
      ),
    );
  }

  if (task.visibility === "PUBLIC") return true;

  return false;
};

export const getMyAssignedTasks = cache(
  withTrace("getMyAssignedTasks", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();
    if (!(await authentication.authorize("task", "read"))) forbidden();

    let tasks = await prisma.task.findMany({
      where: {
        assignments: {
          some: {
            citizenId: authentication.session.entity.id,
          },
        },
        cancelledAt: null,
        deletedAt: null,
        completedAt: null,
        OR: [
          {
            expiresAt: {
              gte: new Date(),
            },
          },
          {
            expiresAt: null,
          },
        ],
      },
      include: {
        assignments: {
          select: {
            citizenId: true,
            citizen: {
              select: {
                id: true,
                handle: true,
              },
            },
          },
        },
        requiredRoles: {
          select: {
            id: true,
          },
        },
        completionists: {
          select: {
            id: true,
          },
        },
      },
    });

    tasks = (
      await Promise.all(
        tasks.map(async (task) => {
          const include = await isVisibleForCurrentUser(task);

          return {
            include,
            task,
          };
        }),
      )
    )
      .filter(({ include }) => include)
      .map(({ task }) => task);

    return tasks;
  }),
);
