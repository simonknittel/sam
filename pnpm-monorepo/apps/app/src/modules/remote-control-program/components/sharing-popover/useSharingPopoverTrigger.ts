"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { useSharingPopoverOpenState } from "./SharingPopoverProvider";
import { useSharingPopoverQuery } from "./useSharingPopoverQuery";

/** The accessible name of the popover and of its triggers */
export const SHARING_POPOVER_TITLE = "Remote Control Program";

/**
 * The open state of the sharing popover and the state of its trigger, for
 * the item of the top bar and the item of the mobile action bar
 *
 * @param canActOnRequest The surface is visible: it opens when a control UI
 * opens the popover (see `useSharingPopoverOpenState()`)
 */
export const useSharingPopoverTrigger = (canActOnRequest: boolean) => {
  const { data } = useSharingPopoverQuery();
  const runtime = useBrowserRuntime();
  const { isOpen, setIsOpen, changeOpenByUser } =
    useSharingPopoverOpenState(canActOnRequest);

  /**
   * The links of the popover (for example a citizen of a grant) do not close
   * it, and the shell stays on the page after a navigation. Thus the popover
   * closes when the path changes.
   */
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setIsOpen(false);
  }

  const isStopped = Boolean(data?.stoppedAt);
  /** The owner does not see the runtime, thus the trigger shows the note */
  const isWaitingForFolderPermission =
    runtime?.state.isWaitingForFolderPermission ?? false;
  const notes = [
    ...(isStopped ? ["alles gestoppt"] : []),
    ...(isWaitingForFolderPermission ? ["Ordnerzugriff nötig"] : []),
  ];

  return {
    isOpen,
    onOpenChange: changeOpenByUser,
    isStopped,
    isWaitingForFolderPermission,
    triggerLabel:
      notes.length > 0
        ? `${SHARING_POPOVER_TITLE}: ${notes.join(", ")}`
        : SHARING_POPOVER_TITLE,
  };
};
