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

export const getTasks = cache(
  withTrace(
    "getTasks",
    async (status = "open", accepted = "all", created_by = "others") => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("task", "read"))) forbidden();

      let rows;

      if (status === "closed") {
        rows = await prisma.task.findMany({
          where: {
            deletedAt: null,
            OR: [
              {
                cancelledAt: {
                  not: null,
                },
              },
              {
                completedAt: {
                  not: null,
                },
              },
              {
                expiresAt: {
                  lt: new Date(),
                },
              },
            ],
            ...(accepted === "yes" && {
              assignments: {
                some: {
                  citizenId: authentication.session.entity?.id,
                },
              },
            }),
            ...(created_by === "me" && {
              createdById: authentication.session.entity?.id,
            }),
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
          orderBy: { createdAt: "desc" },
        });
      } else {
        rows = await prisma.task.findMany({
          where: {
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
            ...(accepted === "yes" && {
              assignments: {
                some: {
                  citizenId: authentication.session.entity?.id,
                },
              },
            }),
            ...(created_by === "me" && {
              createdById: authentication.session.entity?.id,
            }),
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
          orderBy: {
            createdAt: "desc",
          },
        });
      }

      rows = (
        await Promise.all(
          rows.map(async (row) => {
            const include = await isVisibleForCurrentUser(row);

            return {
              include,
              row,
            };
          }),
        )
      )
        .filter(({ include }) => include)
        .map(({ row }) => row);

      return rows;
    },
  ),
);
