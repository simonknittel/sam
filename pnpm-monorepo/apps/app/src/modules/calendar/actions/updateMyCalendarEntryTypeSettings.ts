"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateCalendarEntryTypeSettings,
  updateCalendarEntryTypeSettingsInputSchema,
} from "@sam-monorepo/application";

export const updateMyCalendarEntryTypeSettings = createUseCaseAction({
  name: "updateMyCalendarEntryTypeSettings",
  schema: updateCalendarEntryTypeSettingsInputSchema,
  useCase: updateCalendarEntryTypeSettings,
  /** The schema refuses a key that names no entry type */
  parseFormData: (formData) => ({
    enabled_types: [...new Set(formData.keys())],
  }),
  refresh: (output) => output.enabled.length + output.disabled.length > 0,
  success: (t) => t("Common.successfullySaved"),
});
