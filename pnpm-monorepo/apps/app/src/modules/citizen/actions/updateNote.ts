"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateNoteInputSchema,
  updateNote as updateNoteUseCase,
} from "@sam-monorepo/application";
import { CITIZEN_ERROR_TEXTS } from "../utils/citizenErrorTexts";

export const updateNote = createUseCaseAction({
  name: "updateNote",
  schema: updateNoteInputSchema,
  useCase: updateNoteUseCase,
  parseFormData: (formData) => ({
    log_id: formData.get("id"),
    note_type_id: formData.get("noteTypeId"),
    classification_level_id: formData.get("classificationLevelId"),
  }),
  texts: CITIZEN_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
