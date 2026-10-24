"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  renameOwnGrant,
  renameOwnGrantInputSchema,
} from "@sam-monorepo/application";

export const renameOAuthGrant = createUseCaseAction({
  name: "renameOAuthGrant",
  schema: renameOwnGrantInputSchema,
  useCase: renameOwnGrant,
  parseFormData: (formData) => ({
    grant_id: formData.get("grantId"),
    custom_name: formData.get("customName"),
  }),
  success: (t) => t("Common.successfullySaved"),
});
