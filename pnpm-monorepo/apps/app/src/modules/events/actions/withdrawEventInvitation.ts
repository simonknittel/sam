"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  withdrawEventInvitations,
  withdrawEventInvitationsInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const withdrawEventInvitation = createUseCaseAction({
  name: "withdrawEventInvitation",
  schema: withdrawEventInvitationsInputSchema,
  useCase: withdrawEventInvitations,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    citizen_ids: [formData.get("citizenId")],
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Einladung zurückgezogen.",
});
