"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  removeEventManagers,
  removeEventManagersInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const deleteManager = createUseCaseAction({
  name: "deleteManager",
  schema: removeEventManagersInputSchema,
  useCase: removeEventManagers,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    citizen_ids: [formData.get("managerId")],
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullyDeleted"),
});
