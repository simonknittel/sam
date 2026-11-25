"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { ComponentProps, ReactNode } from "react";

type PopoverBaseUIProps = ComponentProps<typeof PopoverBaseUI>;

interface Props {
  readonly title: string;
  readonly trigger: ReactNode;
  readonly triggerRender: PopoverBaseUIProps["triggerRender"];
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children: ReactNode;
}

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
      // Above the mobile bottom sheet (`z-50`), which can hold a picker
      positionerClassName="z-60"
      childrenClassName="w-80 max-w-[calc(100vw-1rem)]"
    >
      {children}
    </PopoverBaseUI>
  );
};
