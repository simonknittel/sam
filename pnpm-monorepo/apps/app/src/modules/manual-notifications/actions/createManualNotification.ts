"use server";

import {
  createUseCaseAction,
  notificationsFailedWarning,
} from "@/modules/application";
import {
  createManualNotificationInputSchema,
  createManualNotification as createManualNotificationUseCase,
} from "@sam-monorepo/application";
import { MANUAL_NOTIFICATION_ERROR_TEXTS } from "../utils/manualNotificationErrorTexts";

export const createManualNotification = createUseCaseAction({
  name: "createManualNotification",
  schema: createManualNotificationInputSchema,
  useCase: createManualNotificationUseCase,
  parseFormData: (formData) => ({
    title: formData.get("title"),
    body: formData.get("body"),
    citizen_ids: formData.getAll("citizenId[]"),
    role_ids: formData.getAll("roleId[]"),
  }),
  texts: MANUAL_NOTIFICATION_ERROR_TEXTS,
  success: () => "Die Benachrichtigung wurde gesendet.",
  warning: notificationsFailedWarning,
});
