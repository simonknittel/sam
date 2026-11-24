import type { ApplicationErrorTexts } from "@/modules/application";
import { ManualNotificationErrorMessage } from "@sam-monorepo/application";

export const MANUAL_NOTIFICATION_ERROR_TEXTS: ApplicationErrorTexts = {
  [ManualNotificationErrorMessage.NoReceivers]:
    "Wähle mindestens einen Citizen oder eine Rolle aus.",
  [ManualNotificationErrorMessage.UnknownCitizen]:
    "Ein ausgewählter Citizen existiert nicht mehr.",
  [ManualNotificationErrorMessage.UnknownRole]:
    "Eine ausgewählte Rolle existiert nicht oder ist nicht sichtbar.",
};
