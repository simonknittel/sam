"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly title: string;
  readonly isActive: boolean;
  readonly icon: ReactNode;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}

export const ToolbarPopover = ({
  title,
  isActive,
  icon,
  disabled = false,
  children,
}: Props) => {
  return (
    <PopoverBaseUI
      title={title}
      disabled={disabled}
      trigger={
        <span
          aria-label={title}
          className={clsx(
            "flex size-8 items-center justify-center rounded-secondary",
            disabled
              ? "cursor-not-allowed text-neutral-600"
              : "cursor-pointer hover:bg-neutral-800",
            {
              "bg-neutral-800 text-interaction-500": isActive && !disabled,
              "text-neutral-300": !isActive && !disabled,
            },
          )}
        >
          {icon}
        </span>
      }
    >
      <p className="mb-2 font-mono text-xs uppercase text-white/40">{title}</p>
      {children}
    </PopoverBaseUI>
  );
};
