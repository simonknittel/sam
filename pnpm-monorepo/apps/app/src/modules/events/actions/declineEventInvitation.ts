"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  answerEventInvitationInputSchema,
  declineEventInvitation as declineEventInvitationUseCase,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const declineEventInvitation = createUseCaseAction({
  name: "declineEventInvitation",
  schema: answerEventInvitationInputSchema,
  useCase: declineEventInvitationUseCase,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    comment: formData.get("comment") ?? undefined,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Einladung abgelehnt.",
});
