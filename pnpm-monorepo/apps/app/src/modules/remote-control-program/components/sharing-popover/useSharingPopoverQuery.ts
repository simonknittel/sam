"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { api } from "@/trpc/react";
import { useIsRemoteControlProgramAvailable } from "../../runtime/useBrowserRuntime";

/**
 * The data of the sharing popover (the procedure
 * `remoteControlProgram.getSharingPopover`). The items of the shell read it
 * for the mark of the "Stop all". The content of the popover mounts at each
 * open, and the data is stale at once, thus each open fetches it again: the
 * presence of the runtimes changes all the time. The actions of the popover
 * refresh no page (see `useSharingPopoverAction()`). Without the Remote
 * Control Program, nothing reads the data.
 */
export const useSharingPopoverQuery = () =>
  api.remoteControlProgram.getSharingPopover.useQuery(undefined, {
    enabled: useIsRemoteControlProgramAvailable(),
    // The popover shows the error at once, with a button to try again
    retry: false,
  });

/**
 * Wraps a server action of the sharing popover: after the action, also
 * after an error, the popover fetches its data again
 */
export const useSharingPopoverAction = <Response extends ActionResponse>(
  action: (formData: FormData) => Promise<Response>,
) => {
  const utils = api.useUtils();

  return async (formData: FormData) => {
    const response = await action(formData);
    void utils.remoteControlProgram.getSharingPopover.invalidate();
    return response;
  };
};
