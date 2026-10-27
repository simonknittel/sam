"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { FaCheck } from "react-icons/fa";

export interface ItemPickerItem {
  readonly id: string;
  /** The full name. The row truncates long names, thus it is also the title. */
  readonly name: string;
  /**
   * Replaces the name in the row, for example with the underlined characters
   * of a search match
   */
  readonly nameContent?: ReactNode;
  readonly icon?: ReactNode;
  /** Disables the item. The title of the row gives this reason. */
  readonly disabledReason?: string;
}

interface Props {
  readonly item: ItemPickerItem;
  /** The id of the element, for `aria-activedescendant` of the search field */
  readonly elementId: string;
  readonly isActive: boolean;
  readonly isSelected: boolean;
  /** Replaces the checkmark of a selected item, for example with a checkbox */
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
        "flex h-8 items-center gap-2 rounded-secondary px-2 select-none",
        {
          "bg-white/10": isActive,
          "cursor-pointer hover:bg-white/10 active:bg-white/20": !isDisabled,
          "cursor-not-allowed opacity-50": isDisabled,
        },
      )}
    >
      {trailing === undefined && (
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

      {trailing !== undefined && (
        <span className="ml-auto flex flex-none items-center">{trailing}</span>
      )}
    </div>
  );
};
