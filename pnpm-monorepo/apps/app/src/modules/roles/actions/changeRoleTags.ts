"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateRoleInputSchema,
  updateRole as updateRoleUseCase,
} from "@sam-monorepo/application";

export const changeRoleTags = createUseCaseAction({
  name: "changeRoleTags",
  schema: updateRoleInputSchema.pick({
    role_id: true,
    add_tag_ids: true,
    remove_tag_ids: true,
  }),
  useCase: updateRoleUseCase,
  parseFormData: (formData) => ({
    role_id: formData.get("roleId"),
    add_tag_ids: formData.getAll("addTagIds"),
    remove_tag_ids: formData.getAll("removeTagIds"),
  }),
  success: (t) => t("Common.successfullySaved"),
});
