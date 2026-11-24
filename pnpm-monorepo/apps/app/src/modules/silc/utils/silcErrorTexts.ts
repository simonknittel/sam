import type { ApplicationErrorTexts } from "@/modules/application";
import { SilcErrorMessage } from "@sam-monorepo/application";

export const INACTIVE_RECEIVER_ERROR =
  "Mindestens ein Citizen existiert nicht oder ist gelöscht.";

export const SILC_ERROR_TEXTS: ApplicationErrorTexts = {
  [SilcErrorMessage.InactiveReceiver]: INACTIVE_RECEIVER_ERROR,
  [SilcErrorMessage.DuplicateSalaryDay]:
    "Eine Rolle kann nur ein Gehalt pro Tag haben.",
};
