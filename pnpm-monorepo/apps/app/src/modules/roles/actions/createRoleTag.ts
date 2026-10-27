"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createRoleTagInputSchema,
  createRoleTag as createRoleTagUseCase,
  RoleTagErrorMessage,
} from "@sam-monorepo/application";

/** Opens the page of the new tag: the icon and the roles come next */
export const createRoleTag = createUseCaseAction({
  name: "createRoleTag",
  schema: createRoleTagInputSchema,
  useCase: createRoleTagUseCase,
  parseFormData: (formData) => ({
    name: formData.get("name"),
    description: formData.get("description"),
  }),
  texts: {
    [RoleTagErrorMessage.NameTaken]:
      "Ein Tag mit diesem Namen existiert bereits.",
  },
  redirect: (tag) => `/app/iam/tags/${tag.id}`,
});
