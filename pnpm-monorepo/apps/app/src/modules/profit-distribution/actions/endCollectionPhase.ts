"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  endCollectionPhaseInputSchema,
  endCollectionPhase as endCollectionPhaseUseCase,
} from "@sam-monorepo/application";
import { getProfitDistributionErrorTexts } from "../utils/profitDistributionErrorTexts";

export const endCollectionPhase = createUseCaseAction({
  name: "endCollectionPhase",
  schema: endCollectionPhaseInputSchema,
  useCase: endCollectionPhaseUseCase,
  parseFormData: (formData) => ({ cycle_id: formData.get("id") }),
  texts: getProfitDistributionErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
