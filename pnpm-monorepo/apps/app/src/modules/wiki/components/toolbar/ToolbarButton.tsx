"use client";

import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly title: string;
  readonly isActive: boolean;
  /** Optional for type="submit" buttons inside forms */
  readonly onClick?: () => void;
  readonly type?: "button" | "submit";
  readonly disabled?: boolean;
  readonly children: ReactNode;
}

export const ToolbarButton = ({
  title,
  isActive,
  onClick,
  type = "button",
  disabled = false,
  children,
}: Props) => {
  return (
    <Tooltip
      asChild
      triggerChildren={
        <button
          type={type}
          aria-label={title}
          onClick={onClick}
          disabled={disabled}
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
          {children}
        </button>
      }
    >
      {title}
    </Tooltip>
  );
};
