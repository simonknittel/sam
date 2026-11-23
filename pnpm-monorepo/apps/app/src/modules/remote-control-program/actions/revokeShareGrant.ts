"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  revokeShareGrantInputSchema,
  revokeShareGrant as revokeShareGrantUseCase,
} from "@sam-monorepo/application";
import { SHARE_GRANT_ERROR_TEXTS } from "../components/sharing-popover/remoteControlProgramErrorTexts";

/**
 * The form sends the field `grant_id`. The client fetches the popover again
 * after the action (see `useSharingPopoverAction()`).
 */
export const revokeShareGrant = createUseCaseAction({
  name: "revokeShareGrant",
  schema: revokeShareGrantInputSchema,
  useCase: revokeShareGrantUseCase,
  texts: SHARE_GRANT_ERROR_TEXTS,
  refresh: ActionRefresh.Never,
  success: (_t, output) =>
    output.isChanged
      ? "Freigabe widerrufen"
      : "Die Freigabe war schon widerrufen",
});
