"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  setRolePermission,
  setRolePermissionInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { getRoleErrorTexts } from "../utils/roleErrorTexts";

const schema = setRolePermissionInputSchema.extend({
  enabled: z.stringbool(),
});

export const updateSingleRolePermission = createUseCaseAction({
  name: "updateSingleRolePermission",
  schema,
  useCase: setRolePermission,
  parseFormData: (formData) => ({
    role_id: formData.get("roleId"),
    permission_string: formData.get("permissionString"),
    enabled: formData.get("checked"),
  }),
  texts: getRoleErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
