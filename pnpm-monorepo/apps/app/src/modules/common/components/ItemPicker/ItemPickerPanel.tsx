"use client";

import clsx from "clsx";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ItemPickerMode } from "./ItemPickerMode";
import { ItemPickerOption, type ItemPickerItem } from "./ItemPickerOption";

/**
 * Scrolls only the list. `scrollIntoView()` also scrolls the page, and
 * before Base UI positions a new popup, the popup is at the top of the page.
 */
const scrollIntoList = (list: HTMLElement, option: HTMLElement) => {
  if (option.offsetTop < list.scrollTop) {
    list.scrollTop = option.offsetTop;
  } else if (
    option.offsetTop + option.offsetHeight >
    list.scrollTop + list.clientHeight
  ) {
    list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }
};

interface Props {
  readonly className?: string;
  readonly mode: ItemPickerMode;
  /** The accessible name of the list */
  readonly label: string;
  /** Also the accessible name of the search field */
  readonly searchPlaceholder: string;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  /** A row between the search field and the list, for example filter chips */
  readonly toolbar?: ReactNode;
  /**
   * Items above the other items, for example "Alle". The owner filters them
   * with the query.
   */
  readonly extraItems?: readonly ItemPickerItem[];
  /** The items in the order of the list. The owner filters them with the query. */
  readonly items: readonly ItemPickerItem[];
  /**
   * The best match of the search. During a search, it is active until the
   * user moves to a different item. Without it, the first item that is not
   * disabled is active.
   */
  readonly bestMatchId?: ItemPickerItem["id"];
  readonly selectedIds: readonly ItemPickerItem["id"][];
  /** A click or Enter on an item that is not disabled */
  readonly onSelect: (itemId: ItemPickerItem["id"]) => void;
  readonly emptyText: string;
  /**
   * Replaces the checkmark of a selected item at the end of each row, for
   * example with a checkbox. The row stays the control: a click on the row
   * calls `onSelect`.
   */
  readonly renderTrailing?: (
    item: ItemPickerItem,
    isSelected: boolean,
  ) => ReactNode;
}

/**
 * The content of a picker: a search field, an optional toolbar and a list
 * box. It works in a popover (see `ItemPickerPopover`) and also embedded in
 * a page or a modal. The search field takes the focus when the panel opens
 * and keeps it: ArrowUp, ArrowDown, Home and End move the active item, and
 * Enter selects it.
 */
export const ItemPickerPanel = ({
  className,
  mode,
  label,
  searchPlaceholder,
  query,
  onQueryChange,
  toolbar,
  extraItems = [],
  items,
  bestMatchId,
  selectedIds,
  onSelect,
  emptyText,
  renderTrailing,
}: Props) => {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIdSet = new Set(selectedIds);
  const allItems = [...extraItems, ...items];

  /** In single mode, the selected item is active when the panel opens */
  const [activeId, setActiveId] = useState<ItemPickerItem["id"] | null>(() =>
    mode === ItemPickerMode.Single
      ? (allItems.find((item) => selectedIdSet.has(item.id))?.id ?? null)
      : null,
  );

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });

    const list = listRef.current;
    const activeOption = list?.querySelector<HTMLElement>("[data-active]");
    if (list && activeOption) scrollIntoList(list, activeOption);
  }, []);

  /** During a search, Enter selects the best match */
  const enabledItems = allItems.filter(
    (item) => item.disabledReason === undefined,
  );
  const activeItem =
    allItems.find((item) => item.id === activeId) ??
    (query.trim()
      ? (enabledItems.find((item) => item.id === bestMatchId) ??
        enabledItems[0])
      : undefined);
  const activeIndex = activeItem ? allItems.indexOf(activeItem) : -1;

  const getElementId = (itemId: ItemPickerItem["id"]) => `${listId}-${itemId}`;

  const moveTo = (item: ItemPickerItem | undefined) => {
    if (!item) return;

    setActiveId(item.id);

    const list = listRef.current;
    const option = document.getElementById(getElementId(item.id));
    if (list && option) scrollIntoList(list, option);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.nativeEvent.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveTo(allItems[Math.min(activeIndex + 1, allItems.length - 1)]);
        break;

      case "ArrowUp":
        event.preventDefault();
        moveTo(
          activeIndex === -1 ? allItems.at(-1) : allItems[activeIndex - 1],
        );
        break;

      case "Home":
        event.preventDefault();
        moveTo(allItems[0]);
        break;

      case "End":
        event.preventDefault();
        moveTo(allItems.at(-1));
        break;

      // Also without an active item: Enter must not submit the form around an embedded panel
      case "Enter":
        event.preventDefault();
        if (activeItem && activeItem.disabledReason === undefined)
          onSelect(activeItem.id);
        break;
    }
  };

  const renderOption = (item: ItemPickerItem) => {
    const isSelected = selectedIdSet.has(item.id);

    return (
      <ItemPickerOption
        key={item.id}
        item={item}
        elementId={getElementId(item.id)}
        isActive={item === activeItem}
        isSelected={isSelected}
        trailing={renderTrailing?.(item, isSelected)}
        onActivate={setActiveId}
        onSelect={onSelect}
      />
    );
  };

  return (
    <div className={clsx(className)}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeItem ? getElementId(activeItem.id) : undefined
        }
        aria-label={searchPlaceholder}
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => {
          // The search field is not a form field: a form around the picker that saves on each change must not see it
          event.stopPropagation();
          setActiveId(null);
          onQueryChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore="true"
        data-bwignore="true"
        data-lpignore="true"
        className="w-full rounded-secondary border border-neutral-800 bg-neutral-900 p-2 text-sm outline-offset-4 outline-interaction-700 placeholder:text-neutral-500 hover:border-neutral-700 focus-visible:outline-2"
      />

      {toolbar && <div className="mt-2">{toolbar}</div>}

      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        aria-multiselectable={mode === ItemPickerMode.Multiple || undefined}
        className="relative mt-2 max-h-72 overflow-y-auto overscroll-contain empty:hidden"
      >
        {extraItems.map(renderOption)}

        {extraItems.length > 0 && items.length > 0 && (
          <div aria-hidden className="my-1 border-t border-white/10" />
        )}

        {items.map(renderOption)}
      </div>

      {allItems.length === 0 && (
        <p className="mt-2 px-2 text-sm text-neutral-400">{emptyText}</p>
      )}
    </div>
  );
};
