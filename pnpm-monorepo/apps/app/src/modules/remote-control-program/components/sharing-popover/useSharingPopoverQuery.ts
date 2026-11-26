"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { api } from "@/trpc/react";
import { useIsRemoteControlProgramAvailable } from "../../runtime/useBrowserRuntime";

/**
 * The presence and the announcements of the runtimes change while the
 * popover is open, also through the settings of this browser
 */
const READ_INTERVAL_MILLISECONDS = 5_000;

/**
 * Only the content of the open popover reads the data. It mounts at each
 * open, and the data is stale at once, thus each open fetches it again. The
 * actions of the popover refresh no page (see `useSharingPopoverAction()`).
 */
export const useSharingPopoverQuery = () =>
  api.remoteControlProgram.getSharingPopover.useQuery(undefined, {
    enabled: useIsRemoteControlProgramAvailable(),
    refetchInterval: READ_INTERVAL_MILLISECONDS,
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
