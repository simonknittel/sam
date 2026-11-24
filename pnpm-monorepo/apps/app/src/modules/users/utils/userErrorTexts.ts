import type { ApplicationErrorTexts } from "@/modules/application";
import { UserErrorMessage } from "@sam-monorepo/application";

export const USER_ERROR_TEXTS: ApplicationErrorTexts = {
  [UserErrorMessage.CannotBanSelf]: "Du kannst dich nicht selbst sperren.",
  [UserErrorMessage.CannotBanAdmin]:
    "Administratoren können nicht gesperrt werden.",
  [UserErrorMessage.AlreadyBanned]: "Dieser Benutzer ist bereits gesperrt.",
  [UserErrorMessage.NotBanned]: "Dieser Benutzer ist nicht gesperrt.",
};
