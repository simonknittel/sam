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
  readonly children: ReactNode;
}

export const ToolbarButton = ({
  title,
  isActive,
  onClick,
  type = "button",
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
          className={clsx(
            "flex size-8 cursor-pointer items-center justify-center rounded-secondary hover:bg-neutral-800",
            {
              "bg-neutral-800 text-interaction-500": isActive,
              "text-neutral-300": !isActive,
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
