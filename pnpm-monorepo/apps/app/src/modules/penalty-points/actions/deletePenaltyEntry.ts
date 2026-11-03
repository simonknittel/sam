"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  deletePenaltyEntryInputSchema,
  deletePenaltyEntry as deletePenaltyEntryUseCase,
} from "@sam-monorepo/application";

export const deletePenaltyEntry = createUseCaseAction({
  name: "deletePenaltyEntry",
  schema: deletePenaltyEntryInputSchema,
  useCase: deletePenaltyEntryUseCase,
  parseFormData: (formData) => ({
    penalty_entry_id: formData.get("id"),
  }),
  success: (t) => t("Common.successfullyDeleted"),
});
