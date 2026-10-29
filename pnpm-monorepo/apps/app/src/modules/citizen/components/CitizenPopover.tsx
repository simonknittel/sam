"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { Citizen } from "@sam-monorepo/database/browser";
import type { ReactNode } from "react";
import { ProfilePopoverContent, useProfilePopover } from "./ProfilePopover";

interface Props {
  readonly children?: ReactNode;
  readonly citizenId: Citizen["id"];
}

export const CitizenPopover = ({ children, citizenId }: Props) => {
  const { handleOpenChange, popupClassName, query } =
    useProfilePopover(citizenId);

  return (
    <PopoverBaseUI
      title="Citizen-Details"
      trigger={children}
      onOpenChange={handleOpenChange}
      childrenClassName={popupClassName}
      hoverOnly
    >
      <ProfilePopoverContent query={query} />
    </PopoverBaseUI>
  );
};
