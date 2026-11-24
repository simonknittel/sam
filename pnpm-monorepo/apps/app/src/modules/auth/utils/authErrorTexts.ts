import type { ApplicationErrorTexts } from "@/modules/application";
import { AuthErrorMessage } from "@sam-monorepo/application";

export const AUTH_ERROR_TEXTS: ApplicationErrorTexts = {
  [AuthErrorMessage.OwnAccount]: "You cannot assume your own account.",
  [AuthErrorMessage.CurrentSession]:
    "Die aktuelle Sitzung kann nicht gelöscht werden.",
};
