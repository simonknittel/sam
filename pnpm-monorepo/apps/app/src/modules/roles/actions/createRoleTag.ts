"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createRoleTagInputSchema,
  createRoleTag as createRoleTagUseCase,
} from "@sam-monorepo/application";
import { ROLE_TAG_ERROR_TEXTS } from "../utils/roleErrorTexts";

/** Opens the page of the new tag: the icon and the roles come next */
export const createRoleTag = createUseCaseAction({
  name: "createRoleTag",
  schema: createRoleTagInputSchema,
  useCase: createRoleTagUseCase,
  parseFormData: (formData) => ({
    name: formData.get("name"),
    description: formData.get("description"),
  }),
  texts: ROLE_TAG_ERROR_TEXTS,
  redirect: (tag) => `/app/iam/tags/${tag.id}`,
});
