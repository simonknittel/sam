"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { SharingPopoverContent } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverContent";
import { SharingPopoverIcon } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverIcon";
import { useCanUseRemoteControlProgram } from "@/modules/remote-control-program/components/sharing-popover/useCanUseRemoteControlProgram";
import {
  SHARING_POPOVER_TITLE,
  useSharingPopoverTrigger,
} from "@/modules/remote-control-program/components/sharing-popover/useSharingPopoverTrigger";

/** The sharing popover of the Remote Control Program, for a user who can use it */
export const RemoteControlProgram = () => {
  const canUseRemoteControlProgram = useCanUseRemoteControlProgram();
  if (!canUseRemoteControlProgram) return null;

  return <SharingPopover />;
};

const SharingPopover = () => {
  const { isOpen, setIsOpen, isStopped, triggerLabel } =
    useSharingPopoverTrigger();

  return (
    <PopoverBaseUI
      title={SHARING_POPOVER_TITLE}
      trigger={<SharingPopoverIcon isStopped={isStopped} />}
      triggerClassName="h-full px-4 flex items-center text-neutral-500 hover:bg-tertiary hover:text-white focus-visible:bg-tertiary focus-visible:text-white active:text-neutral-300 cursor-pointer"
      triggerTitle={triggerLabel}
      // The popover contains forms: a hover must not open it, and a pointer that leaves it must not close it
      openOnHover={false}
      side="bottom"
      align="end"
      childrenClassName="w-[26rem] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SharingPopoverContent />
    </PopoverBaseUI>
  );
};
