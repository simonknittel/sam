"use client";

import { useState } from "react";
import { Create as TopBarCreate } from "../TopBar/Create";
import { useMobileActionBarFlyout } from "./MobileActionBarFlyout";

/** The "Neu" button of the top bar, in the flyout */
export const Create = () => {
  const flyout = useMobileActionBarFlyout();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * The flyout can close below the open popover (for example through the
   * back navigation of the browser). Then the popover closes with it.
   */
  if (!flyout.isVisible && isOpen) setIsOpen(false);

  return (
    <TopBarCreate
      triggerClassName="w-full"
      side="bottom"
      positionerClassName="z-60"
      open={isOpen}
      onOpenChange={setIsOpen}
      // The modal of a create form opens below the flyout
      onSelect={flyout.hide}
    />
  );
};
