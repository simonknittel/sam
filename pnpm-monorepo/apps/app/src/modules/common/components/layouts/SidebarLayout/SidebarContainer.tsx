"use client";

import clsx from "clsx";
import { useState, type ReactNode } from "react";
import { FaFilter } from "react-icons/fa";
import { Button2, Button2Variant } from "../../Button2";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
  /** Label of the toggle button shown on mobile. Defaults to "Filter". */
  readonly mobileToggleLabel?: string;
  /** Icon of the toggle button shown on mobile. Defaults to a filter icon. */
  readonly mobileToggleIcon?: ReactNode;
}

export const SidebarContainer = ({
  className,
  children,
  mobileToggleLabel = "Filter",
  mobileToggleIcon = <FaFilter />,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsx("flex flex-col gap-0.5", className)}>
      <Button2
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        variant={Button2Variant.Secondary}
        className="w-full md:hidden"
      >
        {mobileToggleIcon}
        {mobileToggleLabel}
      </Button2>

      <div
        className={clsx("flex flex-col gap-0.5", {
          "hidden md:flex": !isOpen,
        })}
      >
        {children}
      </div>
    </div>
  );
};
