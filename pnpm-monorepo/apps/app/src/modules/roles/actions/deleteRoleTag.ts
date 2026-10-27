"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  deleteRoleTagInputSchema,
  deleteRoleTag as deleteRoleTagUseCase,
} from "@sam-monorepo/application";

export const deleteRoleTag = createUseCaseAction({
  name: "deleteRoleTag",
  schema: deleteRoleTagInputSchema,
  useCase: deleteRoleTagUseCase,
  parseFormData: (formData) => ({ tag_id: formData.get("tagId") }),
  redirect: () => "/app/iam/tags",
});
