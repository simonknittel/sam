"use client";

import type { ComponentProps } from "react";
import { LineupClipboardProvider } from "./LineupClipboardContext";
import { LineupOrderProvider } from "./LineupOrderContext/Context";
import { LineupVisibilityProvider, ToggleAll } from "./LineupVisibilityContext";

interface Props extends ComponentProps<typeof LineupOrderProvider> {
  readonly className?: string;
  readonly canManagePositions?: boolean;
}

export const Positions = ({
  container,
  positions,
  canManagePositions,
  variants,
  myShips,
  myRoleIds,
  allEventCitizens,
  showActions,
}: Props) => {
  return (
    <LineupVisibilityProvider items={positions}>
      <ToggleAll className="ml-auto" />

      <LineupClipboardProvider>
        <LineupOrderProvider
          container={container}
          positions={positions}
          showManage={canManagePositions}
          variants={variants}
          myShips={myShips}
          myRoleIds={myRoleIds}
          allEventCitizens={allEventCitizens}
          showActions={showActions}
          className="flex flex-col gap-px"
        />
      </LineupClipboardProvider>
    </LineupVisibilityProvider>
  );
};
