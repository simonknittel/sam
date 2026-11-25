"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useIsLargeViewport } from "@/modules/onboarding/hooks/useIsLargeViewport";
import { LazySharingPopoverContent } from "@/modules/remote-control-program/components/sharing-popover/LazySharingPopoverContent";
import { SharingPopoverIcon } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverIcon";
import {
  SHARING_POPOVER_TITLE,
  useSharingPopoverTrigger,
} from "@/modules/remote-control-program/components/sharing-popover/useSharingPopoverTrigger";
import { useIsRemoteControlProgramAvailable } from "@/modules/remote-control-program/runtime/useBrowserRuntime";
import { BottomSheet } from "./BottomSheet";

/**
 * The sharing popover of the Remote Control Program in a bottom sheet, for a
 * user who can use the program (see `useIsRemoteControlProgramAvailable()`).
 * Its trigger is in the flyout of the mobile action bar.
 */
export const RemoteControlProgram = () => {
  const isAvailable = useIsRemoteControlProgramAvailable();
  if (!isAvailable) return null;

  return <SharingBottomSheet />;
};

const SharingBottomSheet = () => {
  /**
   * The mobile action bar, and thus the flyout, shows only on a small
   * viewport. On a large viewport, the popover of the top bar opens. The
   * sheet is not a part of the flyout: a request of a control UI opens it
   * without the flyout.
   */
  const isSmallViewport = !useIsLargeViewport();
  const {
    isOpen,
    isOpenedByControlUi,
    onOpenChange,
    isWaitingForFolderPermission,
    triggerLabel,
  } = useSharingPopoverTrigger(isSmallViewport);

  return (
    <BottomSheet
      title={SHARING_POPOVER_TITLE}
      trigger={
        <SharingPopoverIcon
          isWaitingForFolderPermission={isWaitingForFolderPermission}
        />
      }
      triggerRender={<Button2 variant={Button2Variant.Secondary} />}
      triggerLabel={triggerLabel}
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <LazySharingPopoverContent isOpenedByControlUi={isOpenedByControlUi} />
    </BottomSheet>
  );
};
