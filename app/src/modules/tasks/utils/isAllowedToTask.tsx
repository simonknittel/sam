import type { Task } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";

export const isAllowedToManageTask = async (
  task: Pick<Task, "createdById">,
) => {
  const authentication = await requireAuthentication();

  if (task.createdById === authentication.session.entity?.id) return true;

  if (await authentication.authorize("task", "manage")) return true;

  return false;
};

export const isAllowedToDeleteTask = async () => {
  const authentication = await requireAuthentication();

  if (await authentication.authorize("task", "delete")) return true;

  return false;
};
