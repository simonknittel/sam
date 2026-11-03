"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  addEventManagers,
  addEventManagersInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const createManagers = createUseCaseAction({
  name: "createManagers",
  schema: addEventManagersInputSchema,
  useCase: addEventManagers,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    citizen_ids: formData
      .getAll("managerId[]")
      .map((managerId) =>
        typeof managerId === "string" ? managerId.trim() : managerId,
      ),
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
