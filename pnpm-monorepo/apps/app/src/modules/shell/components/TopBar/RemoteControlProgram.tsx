"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { useIsLargeViewport } from "@/modules/onboarding/hooks/useIsLargeViewport";
import { LazySharingPopoverContent } from "@/modules/remote-control-program/components/sharing-popover/LazySharingPopoverContent";
import { SharingPopoverIcon } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverIcon";
import {
  SHARING_POPOVER_TITLE,
  useSharingPopoverTrigger,
} from "@/modules/remote-control-program/components/sharing-popover/useSharingPopoverTrigger";
import { useIsRemoteControlProgramAvailable } from "@/modules/remote-control-program/runtime/useBrowserRuntime";

/** The sharing popover of the Remote Control Program, for a user who can use it */
export const RemoteControlProgram = () => {
  const isAvailable = useIsRemoteControlProgramAvailable();
  if (!isAvailable) return null;

  return <SharingPopover />;
};

const SharingPopover = () => {
  /**
   * The top bar, and thus the trigger, shows only on a large viewport. On a
   * small viewport, the bottom sheet opens.
   */
  const isLargeViewport = useIsLargeViewport();
  const {
    isOpen,
    locationOfControlUi,
    onOpenChange,
    isWaitingForFolderPermission,
    triggerLabel,
  } = useSharingPopoverTrigger(isLargeViewport);

  return (
    <PopoverBaseUI
      title={SHARING_POPOVER_TITLE}
      trigger={
        <SharingPopoverIcon
          isWaitingForFolderPermission={isWaitingForFolderPermission}
        />
      }
      triggerClassName="h-full px-4 flex items-center text-neutral-500 hover:bg-tertiary hover:text-white focus-visible:bg-tertiary focus-visible:text-white active:text-neutral-300 cursor-pointer"
      triggerTitle={triggerLabel}
      // The popover contains forms: a hover must not open it, and a pointer that leaves it must not close it
      openOnHover={false}
      side="bottom"
      align="end"
      childrenClassName="w-[42rem] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain"
      open={isOpen}
      onOpenChange={onOpenChange}
      moveFocusIntoPopup={locationOfControlUi !== null}
    >
      <LazySharingPopoverContent locationOfControlUi={locationOfControlUi} />
    </PopoverBaseUI>
  );
};
