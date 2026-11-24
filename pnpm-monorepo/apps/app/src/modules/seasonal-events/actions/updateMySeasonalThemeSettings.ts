"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateSeasonalThemeSettingsInputSchema,
  updateSeasonalThemeSettings as updateSeasonalThemeSettingsUseCase,
} from "@sam-monorepo/application";

export const updateMySeasonalThemeSettings = createUseCaseAction({
  name: "updateMySeasonalThemeSettings",
  schema: updateSeasonalThemeSettingsInputSchema,
  useCase: updateSeasonalThemeSettingsUseCase,
  /** The schema refuses a key that names no event of the calendar */
  parseFormData: (formData) => ({
    enabled_event_keys: [...new Set(formData.keys())],
  }),
  success: (t) => t("Common.successfullySaved"),
});
