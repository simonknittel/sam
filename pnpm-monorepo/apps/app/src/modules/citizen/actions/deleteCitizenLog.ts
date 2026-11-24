"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  deleteCitizenLogInputSchema,
  deleteCitizenLog as deleteCitizenLogUseCase,
} from "@sam-monorepo/application";
import { CITIZEN_ERROR_TEXTS } from "../utils/citizenErrorTexts";

export const deleteCitizenLog = createUseCaseAction({
  name: "deleteCitizenLog",
  schema: deleteCitizenLogInputSchema,
  useCase: deleteCitizenLogUseCase,
  parseFormData: (formData) => ({ log_id: formData.get("id") }),
  texts: CITIZEN_ERROR_TEXTS,
  success: (t) => t("Common.successfullyDeleted"),
});
