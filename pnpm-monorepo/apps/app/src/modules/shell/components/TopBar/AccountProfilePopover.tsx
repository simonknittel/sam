"use client";

import {
  ProfilePopoverContent,
  useProfilePopover,
} from "@/modules/citizen/components/ProfilePopover";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { Citizen } from "@sam-monorepo/database/browser";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AccountSettings } from "./AccountSettings";
import { Logout } from "./Logout";

interface Props {
  readonly citizenId: Citizen["id"];
  readonly trigger: ReactNode;
  readonly triggerClassName: string;
}

/**
 * The account popover of a user with a citizen: the profile of the own
 * citizen, the same as the dashboard tile, and the controls of the account.
 */
export const AccountProfilePopover = ({
  citizenId,
  trigger,
  triggerClassName,
}: Props) => {
  const { isOpen, handleOpenChange, popupClassName, query } =
    useProfilePopover(citizenId);

  /**
   * The links of the profile do not close the popover, and the top bar
   * stays on the page after a navigation. Thus the popover closes when the
   * path changes.
   */
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    handleOpenChange(false);
  }

  return (
    <PopoverBaseUI
      title="Account"
      trigger={trigger}
      triggerClassName={triggerClassName}
      triggerTitle="Account"
      childrenClassName={popupClassName}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <ProfilePopoverContent query={query} />

      <div className="mt-2 flex gap-2 border-t border-neutral-700 pt-4">
        <AccountSettings className="flex-1" />
        <Logout className="flex-1" />
      </div>
    </PopoverBaseUI>
  );
};
