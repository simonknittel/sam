"use client";

import { useId, type ReactNode } from "react";

export interface ItemPickerItemGroup {
  readonly id: string;
  readonly name: string;
  readonly icon?: ReactNode;
}

interface Props {
  readonly group: ItemPickerItemGroup;
  readonly children: ReactNode;
}

export const ItemPickerGroup = ({ group, children }: Props) => {
  const headingId = useId();

  return (
    <div role="group" aria-labelledby={headingId}>
      <div className="flex h-8 items-center gap-2 px-2 select-none">
        <span
          aria-hidden
          className="flex size-6 flex-none items-center justify-center"
        >
          {group.icon}
        </span>

        <span
          id={headingId}
          title={group.name}
          className="truncate font-mono text-xs text-neutral-400 uppercase"
        >
          {group.name}
        </span>
      </div>

      {children}
    </div>
  );
};
