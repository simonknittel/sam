import { getApplicationContext } from "@/modules/application";
import { getHumanResourcesRoleIds as getHumanResourcesRoleIdsUseCase } from "@sam-monorepo/application";
import { cache } from "react";

/**
 * The ids of the roles that count as Human Resources. No permission check:
 * the settings page of the IAM app checks `role;manage`.
 */
export const getHumanResourcesRoleIds = cache(() =>
  getHumanResourcesRoleIdsUseCase(getApplicationContext()),
);
