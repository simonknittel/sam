"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import { REMOTE_CONTROL_PROGRAM_ERROR_TEXTS } from "../components/sharing-popover/remoteControlProgramErrorTexts";
import { getSharingPopover } from "../queries/getSharingPopover";

/**
 * The read of the sharing popover. The shell renders the popover in the top
 * bar and in the mobile action bar, and the server loader of the mobile
 * action bar gives no data to the client. Thus the popover reads in the
 * browser, at each open, because the presence of the runtimes changes all
 * the time (see `useSharingPopoverQuery()`).
 */
export const loadSharingPopover = createUseCaseAction({
  name: "loadSharingPopover",
  useCase: getSharingPopover,
  texts: REMOTE_CONTROL_PROGRAM_ERROR_TEXTS,
  refresh: ActionRefresh.Never,
  // The popover shows no text for a successful read
  success: () => "",
  responseFields: (sharingPopover) => ({ sharingPopover }),
});
