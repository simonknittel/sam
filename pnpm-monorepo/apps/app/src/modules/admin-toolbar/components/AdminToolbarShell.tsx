"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import clsx from "clsx";
import type { ReactNode } from "react";
import { FaTools } from "react-icons/fa";

interface Props {
  /** Labels of the active overrides, which the collapsed toolbar shows */
  readonly activeOverrides: readonly string[];
  readonly children: ReactNode;
}

export const AdminToolbarShell = ({ activeOverrides, children }: Props) => {
  return (
    <PopoverBaseUI
      title="Admin tools"
      trigger={
        <span className="flex min-w-0 items-center gap-2">
          <FaTools className="shrink-0" aria-hidden />
          <span className="whitespace-nowrap">Admin tools</span>

          {activeOverrides.map((label) => (
            <AdminToolbarBadge key={label} label={label} />
          ))}
        </span>
      }
      triggerClassName={clsx(
        "min-w-0 backdrop-blur-sm px-2 py-1 rounded-secondary transition-colors motion-reduce:transition-none text-xs font-mono uppercase cursor-pointer",
        {
          "bg-neutral-500/50 hover:bg-neutral-500 focus-visible:bg-neutral-500 active:bg-neutral-400":
            activeOverrides.length === 0,
          "bg-amber-600/50 hover:bg-amber-600 focus-visible:bg-amber-600 active:bg-amber-500":
            activeOverrides.length > 0,
        },
      )}
      openOnHover={false}
      side="bottom"
      positionerClassName="z-50"
      childrenClassName="flex w-80 flex-col gap-4"
    >
      {children}
    </PopoverBaseUI>
  );
};

interface AdminToolbarBadgeProps {
  readonly label: string;
}

const AdminToolbarBadge = ({ label }: AdminToolbarBadgeProps) => {
  return (
    <span
      className="min-w-0 truncate rounded-secondary bg-black/40 px-1"
      title={label}
    >
      {label}
    </span>
  );
};
