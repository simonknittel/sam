"use server";

import { createUseCaseAction } from "@/modules/application";
import { getRoleErrorTexts } from "@/modules/roles/utils/roleErrorTexts";
import {
  changeRoleAssignmentLevelInputSchema,
  increaseRoleAssignmentLevel as increaseRoleAssignmentLevelUseCase,
} from "@sam-monorepo/application";

export const increaseRoleAssignmentLevel = createUseCaseAction({
  name: "increaseRoleAssignmentLevel",
  schema: changeRoleAssignmentLevelInputSchema,
  useCase: increaseRoleAssignmentLevelUseCase,
  parseFormData: (formData) => ({
    citizen_id: formData.get("citizenId"),
    role_id: formData.get("roleId"),
  }),
  texts: getRoleErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
