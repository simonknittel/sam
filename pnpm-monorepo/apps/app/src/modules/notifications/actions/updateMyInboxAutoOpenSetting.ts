"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateInboxAutoOpenSetting,
  updateInboxAutoOpenSettingInputSchema,
} from "@sam-monorepo/application";
import { INBOX_AUTO_OPEN_INPUT_NAME } from "../utils/inboxAutoOpenInputName";

export const updateMyInboxAutoOpenSetting = createUseCaseAction({
  name: "updateMyInboxAutoOpenSetting",
  schema: updateInboxAutoOpenSettingInputSchema,
  useCase: updateInboxAutoOpenSetting,
  // The form sends the input only while the checkbox is switched on
  parseFormData: (formData) => ({
    enabled: formData.has(INBOX_AUTO_OPEN_INPUT_NAME),
  }),
  // The layout gives the setting to the inbox
  refresh: (output) => output.changed,
  success: (t) => t("Common.successfullySaved"),
});
