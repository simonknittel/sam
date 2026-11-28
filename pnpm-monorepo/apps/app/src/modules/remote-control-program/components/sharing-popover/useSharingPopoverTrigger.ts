"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { useSharingPopoverOpenState } from "./SharingPopoverProvider";

/** The accessible name of the popover and of its triggers */
export const SHARING_POPOVER_TITLE = "Remote Control Program";

/**
 * The open state of the sharing popover and the state of its trigger, for
 * the item of the top bar and the button in the flyout of the mobile action
 * bar
 *
 * @param canActOnRequest The surface is visible: it opens when a control UI
 * opens the popover (see `useSharingPopoverOpenState()`)
 */
export const useSharingPopoverTrigger = (canActOnRequest: boolean) => {
  const runtime = useBrowserRuntime();
  const { isOpen, locationOfControlUi, setIsOpen, changeOpenByUser } =
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

  /** The owner does not see the runtime, thus the trigger shows the note */
  const isWaitingForFolderPermission =
    runtime?.state.isWaitingForFolderPermission ?? false;

  return {
    isOpen,
    locationOfControlUi,
    onOpenChange: changeOpenByUser,
    isWaitingForFolderPermission,
    triggerLabel: isWaitingForFolderPermission
      ? `${SHARING_POPOVER_TITLE}: Ordnerzugriff nötig`
      : SHARING_POPOVER_TITLE,
  };
};
