"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  approveEventApplications,
  approveEventApplicationsInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const approveEventApplication = createUseCaseAction({
  name: "approveEventApplication",
  schema: approveEventApplicationsInputSchema,
  useCase: approveEventApplications,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    citizen_ids: [formData.get("citizenId")],
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Teilnahmeanfrage angenommen.",
});
