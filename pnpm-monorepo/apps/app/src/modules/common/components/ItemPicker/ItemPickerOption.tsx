"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { FaCheck } from "react-icons/fa";
import type { ItemPickerItemGroup } from "./ItemPickerGroup";

export interface ItemPickerItem {
  readonly id: string;
  readonly name: string;
  readonly nameContent?: ReactNode;
  readonly icon?: ReactNode;
  readonly disabledReason?: string;
  /**
   * The group of the item. The list shows a heading above each run of items
   * with the same group, thus the owner sorts the items by group.
   */
  readonly group?: ItemPickerItemGroup;
}

interface Props {
  readonly item: ItemPickerItem;
  readonly elementId: string;
  readonly isActive: boolean;
  readonly isSelected: boolean;
  readonly trailing?: ReactNode;
  readonly onActivate: (itemId: ItemPickerItem["id"]) => void;
  readonly onSelect: (itemId: ItemPickerItem["id"]) => void;
}

/**
 * The search field keeps the focus while the arrow keys move through the
 * list. Thus the active row shows the focus state. The translucent colours
 * show on black and on the grey of a modal.
 */
export const ItemPickerOption = ({
  item,
  elementId,
  isActive,
  isSelected,
  trailing,
  onActivate,
  onSelect,
}: Props) => {
  const isDisabled = item.disabledReason !== undefined;
  const hasTrailing = trailing !== undefined;

  return (
    <div
      id={elementId}
      role="option"
      aria-selected={isSelected}
      aria-disabled={isDisabled || undefined}
      title={isDisabled ? `${item.name}\n${item.disabledReason}` : item.name}
      data-active={isActive || undefined}
      onPointerMove={() => {
        if (!isActive) onActivate(item.id);
      }}
      // Keeps the focus in the search field
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (!isDisabled) onSelect(item.id);
      }}
      className={clsx(
        "flex items-center gap-2 rounded-secondary px-2 select-none",
        {
          "h-8": !hasTrailing,
          // A trailing control (for example a checkbox) can be as high as a compact row. The higher row keeps the controls of two rows apart.
          "h-10": hasTrailing,
          "bg-white/10": isActive,
          "cursor-pointer hover:bg-white/10 active:bg-white/20": !isDisabled,
          "cursor-not-allowed opacity-50": isDisabled,
        },
      )}
    >
      {!hasTrailing && (
        <FaCheck
          aria-hidden
          className={clsx("size-2.5 flex-none text-brand-red-300", {
            invisible: !isSelected,
          })}
        />
      )}

      <span className="flex size-6 flex-none items-center justify-center">
        {item.icon}
      </span>

      <span className="truncate font-mono text-sm">
        {item.nameContent ?? item.name}
      </span>

      {hasTrailing && (
        <span className="ml-auto flex flex-none items-center">{trailing}</span>
      )}
    </div>
  );
};
