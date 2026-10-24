import { getRequestActor } from "@/modules/application";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { isAllowedToManageTask as isActorAllowedToManageTask } from "@sam-monorepo/application";
import type { Task } from "@sam-monorepo/database/client";

export const isAllowedToManageTask = async (task: Pick<Task, "createdById">) =>
  isActorAllowedToManageTask(await getRequestActor(), task);

export const isAllowedToDeleteTask = async () => {
  const authentication = await requireAuthenticationPage();

  if (await authentication.authorize("task", "delete")) return true;

  return false;
};
