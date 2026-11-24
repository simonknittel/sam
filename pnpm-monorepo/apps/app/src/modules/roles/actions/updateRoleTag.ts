"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateRoleTagInputSchema,
  updateRoleTag as updateRoleTagUseCase,
} from "@sam-monorepo/application";
import { ROLE_TAG_ERROR_TEXTS } from "../utils/roleErrorTexts";

export const updateRoleTag = createUseCaseAction({
  name: "updateRoleTag",
  schema: updateRoleTagInputSchema,
  useCase: updateRoleTagUseCase,
  parseFormData: (formData) => ({
    tag_id: formData.get("tagId"),
    name: formData.get("name"),
    description: formData.get("description"),
    add_role_ids: formData.getAll("addRoleIds"),
    remove_role_ids: formData.getAll("removeRoleIds"),
  }),
  texts: ROLE_TAG_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
