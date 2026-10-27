"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateRoleInputSchema,
  updateRole as updateRoleUseCase,
} from "@sam-monorepo/application";

/**
 * Saves the changes of the tags of a role. The form gives the add and remove
 * lists against the tags that the page loaded, thus a tag that a different
 * user added after the load stays.
 */
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
