"use client";

import { useIsLargeViewport } from "@/modules/onboarding/hooks/useIsLargeViewport";
import { LazySharingPopoverContent } from "@/modules/remote-control-program/components/sharing-popover/LazySharingPopoverContent";
import { SharingPopoverIcon } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverIcon";
import {
  SHARING_POPOVER_TITLE,
  useSharingPopoverTrigger,
} from "@/modules/remote-control-program/components/sharing-popover/useSharingPopoverTrigger";
import { useIsRemoteControlProgramAvailable } from "@/modules/remote-control-program/runtime/useBrowserRuntime";
import { BarItemContent } from "./BarItemContent";
import { BottomSheet } from "./BottomSheet";

/**
 * The sharing popover of the Remote Control Program in a bottom sheet, for a
 * user who can use the program (see `useIsRemoteControlProgramAvailable()`)
 */
export const RemoteControlProgram = () => {
  const isAvailable = useIsRemoteControlProgramAvailable();
  if (!isAvailable) return null;

  return <SharingBottomSheet />;
};

const SharingBottomSheet = () => {
  /**
   * The mobile action bar, and thus the trigger, shows only on a small
   * viewport. On a large viewport, the popover of the top bar opens.
   */
  const isSmallViewport = !useIsLargeViewport();
  const {
    isOpen,
    isOpenedByControlUi,
    onOpenChange,
    isStopped,
    isWaitingForFolderPermission,
    triggerLabel,
  } = useSharingPopoverTrigger(isSmallViewport);

  return (
    <BottomSheet
      title={SHARING_POPOVER_TITLE}
      trigger={
        <BarItemContent
          icon={
            <SharingPopoverIcon
              isStopped={isStopped}
              isWaitingForFolderPermission={isWaitingForFolderPermission}
            />
          }
          label="Remote"
        />
      }
      triggerLabel={triggerLabel}
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <LazySharingPopoverContent isOpenedByControlUi={isOpenedByControlUi} />
    </BottomSheet>
  );
};
