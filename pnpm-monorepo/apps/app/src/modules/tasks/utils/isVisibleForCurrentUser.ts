import { requireAuthentication } from "@/modules/auth/server";
import type {
  Entity,
  Role,
  Task,
  TaskAssignment,
} from "@sam-monorepo/database/client";

interface TaskForVisibility extends Pick<
  Task,
  "createdById" | "hiddenForOtherRoles" | "visibility"
> {
  assignments: readonly Pick<TaskAssignment, "citizenId">[];
  completionists?: readonly Pick<Entity, "id">[];
  requiredRoles: readonly Pick<Role, "id">[];
}

export const isVisibleForCurrentUser = async (task: TaskForVisibility) => {
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
