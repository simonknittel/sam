"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateHumanResourcesRolesInputSchema,
  updateHumanResourcesRoles as updateHumanResourcesRolesUseCase,
} from "@sam-monorepo/application";
import { getIamErrorTexts } from "../utils/iamErrorTexts";

/** Replaces the whole list of the roles that count as Human Resources */
export const updateHumanResourcesRoles = createUseCaseAction({
  name: "updateHumanResourcesRoles",
  schema: updateHumanResourcesRolesInputSchema,
  useCase: updateHumanResourcesRolesUseCase,
  parseFormData: (formData) => ({ role_ids: formData.getAll("roleId") }),
  texts: getIamErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
