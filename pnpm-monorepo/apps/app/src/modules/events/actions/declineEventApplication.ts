"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  declineEventApplications,
  declineEventApplicationsInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const declineEventApplication = createUseCaseAction({
  name: "declineEventApplication",
  schema: declineEventApplicationsInputSchema,
  useCase: declineEventApplications,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    citizen_ids: [formData.get("citizenId")],
    reason: formData.get("reason") ?? undefined,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Teilnahmeanfrage abgelehnt.",
});
