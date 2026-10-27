"use server";

import {
  createUseCaseAction,
  notificationsFailedWarning,
} from "@/modules/application";
import { getRoleErrorTexts } from "@/modules/roles/utils/roleErrorTexts";
import {
  updateRoleAssignmentsInputSchema,
  updateRoleAssignments as updateRoleAssignmentsUseCase,
} from "@sam-monorepo/application";

export const updateRoleAssignments = createUseCaseAction({
  name: "updateRoleAssignments",
  schema: updateRoleAssignmentsInputSchema,
  useCase: updateRoleAssignmentsUseCase,
  parseFormData: (formData) => ({
    citizen_id: formData.get("citizenId"),
    role_ids: formData.getAll("roleId"),
  }),
  texts: getRoleErrorTexts,
  success: (t) => t("Common.successfullySaved"),
  warning: notificationsFailedWarning,
});
