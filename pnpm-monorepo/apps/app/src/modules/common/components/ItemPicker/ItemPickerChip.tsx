"use client";

import type { ReactNode } from "react";
import { FaTrash } from "react-icons/fa";

interface Props {
  readonly title: string;
  readonly onRemove: () => void;
  /**
   * The selected item. It gives its own height and left padding, like
   * `RolePickerValue` (`h-8 px-2`).
   */
  readonly children: ReactNode;
}

export const ItemPickerChip = ({ title, onRemove, children }: Props) => {
  return (
    <button
      type="button"
      onClick={onRemove}
      title={title}
      className="group flex max-w-full cursor-pointer items-center gap-1 rounded-secondary bg-neutral-700/50 pr-2 outline-offset-2 outline-interaction-700 hover:bg-neutral-700/70 focus-visible:bg-neutral-700/70 focus-visible:outline-2 active:bg-neutral-700/40"
    >
      {children}

      <FaTrash className="flex-none text-brand-red-500 group-hover:text-brand-red-300 group-focus-visible:text-brand-red-300 group-active:text-brand-red-700" />
    </button>
  );
};
