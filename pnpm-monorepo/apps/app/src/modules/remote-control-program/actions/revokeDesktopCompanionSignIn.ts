"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  revokeOwnDesktopCompanionSignIn,
  revokeOwnDesktopCompanionSignInInputSchema,
} from "@sam-monorepo/application";
import { DESKTOP_COMPANION_SIGN_IN_ERROR_TEXTS } from "../utils/remoteControlProgramErrorTexts";

/**
 * The form sends the field `grant_id`. The client fetches the popover again
 * after the action (see `useSharingPopoverAction()`).
 */
export const revokeDesktopCompanionSignIn = createUseCaseAction({
  name: "revokeDesktopCompanionSignIn",
  schema: revokeOwnDesktopCompanionSignInInputSchema,
  useCase: revokeOwnDesktopCompanionSignIn,
  texts: DESKTOP_COMPANION_SIGN_IN_ERROR_TEXTS,
  refresh: ActionRefresh.Never,
  success: (_t, output) =>
    output.isChanged
      ? "Desktop Companion abgemeldet"
      : "Die Anmeldung war schon beendet",
});
