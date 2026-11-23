"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadSharingPopover } from "../../actions/loadSharingPopover";
import { useIsRemoteControlProgramAvailable } from "../../runtime/useBrowserRuntime";

const SHARING_POPOVER_QUERY_KEY = ["remoteControlProgram", "sharingPopover"];

/** The error response of the read. Its message is a German text for the popover. */
export class SharingPopoverReadError extends Error {}

const fetchSharingPopover = async () => {
  const response = await loadSharingPopover(new FormData());
  if ("error" in response) throw new SharingPopoverReadError(response.error);

  return response.sharingPopover;
};

/**
 * The data of the sharing popover. The items of the shell read it for the
 * mark of the "Stop all". The content of the popover mounts at each open,
 * and the data is stale at once, thus each open fetches it again: the
 * presence of the runtimes changes all the time. The actions of the popover
 * refresh no page (see `useSharingPopoverAction()`). Without the Remote
 * Control Program, nothing reads the data.
 */
export const useSharingPopoverQuery = () =>
  useQuery({
    queryKey: SHARING_POPOVER_QUERY_KEY,
    queryFn: fetchSharingPopover,
    enabled: useIsRemoteControlProgramAvailable(),
    // A retry does not repair a failed server action, for example after a release. The popover shows a button to try again.
    retry: false,
  });

/**
 * Wraps a server action of the sharing popover: after the action, also
 * after an error, the popover fetches its data again
 */
export const useSharingPopoverAction = <Response extends ActionResponse>(
  action: (formData: FormData) => Promise<Response>,
) => {
  const queryClient = useQueryClient();

  return async (formData: FormData) => {
    const response = await action(formData);
    void queryClient.invalidateQueries({
      queryKey: SHARING_POPOVER_QUERY_KEY,
    });
    return response;
  };
};
