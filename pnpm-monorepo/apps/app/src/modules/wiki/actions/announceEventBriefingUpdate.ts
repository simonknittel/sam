"use server";

import {
  ActionRefresh,
  createUseCaseAction,
  notificationsFailedWarning,
} from "@/modules/application";
import {
  announceEventBriefingUpdateInputSchema,
  announceEventBriefingUpdate as announceEventBriefingUpdateUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

/** See `announceEventBriefingUpdate()` of the application */
export const announceEventBriefingUpdate = createUseCaseAction({
  name: "announceEventBriefingUpdate",
  schema: announceEventBriefingUpdateInputSchema,
  useCase: announceEventBriefingUpdateUseCase,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
  }),
  texts: WIKI_ERROR_TEXTS,
  // The announcement changes nothing that the page shows
  refresh: ActionRefresh.Never,
  success: () => "Die Benachrichtigung wurde gesendet.",
  warning: notificationsFailedWarning,
});
