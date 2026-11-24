"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  setRoleInheritance,
  setRoleInheritanceInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { getRoleErrorTexts } from "../utils/roleErrorTexts";

const schema = setRoleInheritanceInputSchema.extend({
  enabled: z.stringbool(),
});

export const updateSingleRoleInheritance = createUseCaseAction({
  name: "updateSingleRoleInheritance",
  schema,
  useCase: setRoleInheritance,
  parseFormData: (formData) => ({
    role_id: formData.get("roleId"),
    inherited_role_id: formData.get("inheritedRoleId"),
    enabled: formData.get("checked"),
  }),
  texts: getRoleErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
