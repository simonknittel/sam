"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly title: string;
  readonly isActive: boolean;
  readonly icon: ReactNode;
  readonly children: ReactNode;
}

export const ToolbarPopover = ({ title, isActive, icon, children }: Props) => {
  return (
    <PopoverBaseUI
      trigger={
        <span
          title={title}
          className={clsx(
            "flex size-8 cursor-pointer items-center justify-center rounded-secondary hover:bg-neutral-800",
            {
              "bg-neutral-800 text-interaction-500": isActive,
              "text-neutral-300": !isActive,
            },
          )}
        >
          {icon}
        </span>
      }
    >
      {children}
    </PopoverBaseUI>
  );
};
