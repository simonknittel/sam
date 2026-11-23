"use client";

import { SharingPopoverContent } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverContent";
import { SharingPopoverIcon } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverIcon";
import {
  SHARING_POPOVER_TITLE,
  useSharingPopoverTrigger,
} from "@/modules/remote-control-program/components/sharing-popover/useSharingPopoverTrigger";
import { BarItemContent } from "./BarItemContent";
import { BottomSheet } from "./BottomSheet";

/**
 * The sharing popover of the Remote Control Program in a bottom sheet. The
 * action bar shows the item only for a user who can use the program (see
 * `useCanUseRemoteControlProgram()`).
 */
export const RemoteControlProgram = () => {
  const { isOpen, setIsOpen, isStopped, triggerLabel } =
    useSharingPopoverTrigger();

  return (
    <BottomSheet
      title={SHARING_POPOVER_TITLE}
      trigger={
        <BarItemContent
          icon={<SharingPopoverIcon isStopped={isStopped} />}
          label="Remote"
        />
      }
      triggerLabel={triggerLabel}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SharingPopoverContent />
    </BottomSheet>
  );
};
