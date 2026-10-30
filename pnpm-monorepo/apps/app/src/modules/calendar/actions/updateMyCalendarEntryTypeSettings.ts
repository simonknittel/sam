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
  /**
   * A checked box sends the value of its type; a cleared box sends nothing.
   * The schema refuses a value that names no entry type.
   */
  parseFormData: (formData) => ({
    enabled_types: [...new Set(formData.keys())],
  }),
  /** A save that changes nothing leaves the page as it is */
  refresh: (output) => output.enabled.length + output.disabled.length > 0,
  success: (t) => t("Common.successfullySaved"),
});
