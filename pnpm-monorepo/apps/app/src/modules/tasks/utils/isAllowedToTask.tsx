import { getRequestActor } from "@/modules/application";
import { requireAuthenticationPage } from "@/modules/auth/server";
import {
  isAllowedToManageTask as isActorAllowedToManageTask,
  type VisibleTask,
} from "@sam-monorepo/application";

export const isAllowedToManageTask = async (
  task: Pick<VisibleTask, "createdById">,
) => isActorAllowedToManageTask(await getRequestActor(), task);

export const isAllowedToDeleteTask = async () => {
  const authentication = await requireAuthenticationPage();

  if (await authentication.authorize("task", "delete")) return true;

  return false;
};
