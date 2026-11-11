"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  acceptEventInvitation as acceptEventInvitationUseCase,
  answerEventInvitationInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const acceptEventInvitation = createUseCaseAction({
  name: "acceptEventInvitation",
  schema: answerEventInvitationInputSchema,
  useCase: acceptEventInvitationUseCase,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    comment: formData.get("comment") ?? undefined,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Einladung angenommen. Du bist angemeldet.",
});
