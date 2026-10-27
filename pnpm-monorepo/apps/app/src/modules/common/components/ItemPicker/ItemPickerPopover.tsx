"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { ComponentProps, ReactNode } from "react";

type PopoverBaseUIProps = ComponentProps<typeof PopoverBaseUI>;

interface Props {
  /** The accessible name of the popup */
  readonly title: string;
  readonly trigger: ReactNode;
  readonly triggerRender: PopoverBaseUIProps["triggerRender"];
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Usually an `ItemPickerPanel`, which takes the focus */
  readonly children: ReactNode;
}

/**
 * The popover of a picker. It opens on a click below its trigger. Escape and
 * a click outside close it, and the focus then goes back to the trigger.
 */
export const ItemPickerPopover = ({
  title,
  trigger,
  triggerRender,
  open,
  onOpenChange,
  children,
}: Props) => {
  return (
    <PopoverBaseUI
      title={title}
      trigger={trigger}
      triggerRender={triggerRender}
      open={open}
      onOpenChange={onOpenChange}
      openOnHover={false}
      side="bottom"
      align="start"
      positionerClassName="z-40"
      childrenClassName="w-80 max-w-[calc(100vw-1rem)]"
    >
      {children}
    </PopoverBaseUI>
  );
};
