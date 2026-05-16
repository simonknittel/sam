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
