"use client";

import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { Combobox } from "@base-ui/react/combobox";
import clsx from "clsx";
import { useTopLoader } from "nextjs-toploader";
import {
  parseAsArrayOf,
  parseAsString,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { useCallback, useEffect, useId, useMemo, useTransition } from "react";
import { FaCheck, FaChevronDown, FaTimes } from "react-icons/fa";

interface Item {
  readonly value: string;
  readonly label: string;
  readonly group?: string;
}

interface Props {
  readonly name: string;
  readonly label: string;
  readonly items: Item[];
  readonly className?: string;
  readonly placeholder?: string;
  readonly resetCursorPagination?: boolean;
}

export const MultiSelectComboboxFilter = ({
  name,
  label,
  items,
  className,
  placeholder = "Alle",
  resetCursorPagination,
}: Props) => {
  const id = useId();
  const [isLoading, startTransition] = useTransition();

  const [selectedValues, setSelectedValues] = useQueryState(
    name,
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({
      shallow: false,
      startTransition,
    }),
  );
  const [, setPagination] = useQueryStates(cursorPaginationParsers, {
    shallow: false,
    startTransition,
  });

  const selectedItems = useMemo(() => {
    if (selectedValues.length === 0) return [];

    const selected = new Set(selectedValues);
    return items.filter((item) => selected.has(item.value));
  }, [items, selectedValues]);

  const setValueAndResetPagination = useCallback(
    async (newItems: Item[]) => {
      await setSelectedValues(newItems.map((item) => item.value));

      if (resetCursorPagination) {
        await setPagination({
          cursor: null,
          direction: null,
        });
      }
    },
    [setPagination, setSelectedValues, resetCursorPagination],
  );

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) {
      loader.start();
    }
  }, [loader, isLoading]);

  const hasGroups = items.some((item) => item.group !== undefined);

  const groupedItems = useMemo(() => {
    if (!hasGroups) return null;

    const groups = new Map<string, Item[]>();
    for (const item of items) {
      const group = item.group ?? "";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items, hasGroups]);

  return (
    <div className={clsx("bg-secondary p-2 corners-secondary", className)}>
      <p className="text-sm text-neutral-500 font-mono uppercase">{label}</p>

      <Combobox.Root
        items={items.sort((a, b) => a.label.localeCompare(b.label))}
        value={selectedItems}
        multiple
        onValueChange={setValueAndResetPagination}
      >
        <div className="mt-1">
          <div className="p-1 rounded-secondary bg-neutral-900 border border-neutral-800 focus-visible:outline-2 outline-interaction-700 outline-offset-4 relative">
            <Combobox.InputGroup>
              <Combobox.Chips className="flex w-full flex-wrap items-center gap-1 pr-6">
                <Combobox.Value>
                  {(value: Item[]) => (
                    <>
                      {value
                        .sort((a, b) => a.label.localeCompare(b.label))
                        .map((item) => (
                          <Combobox.Chip
                            key={item.value}
                            className="flex items-center gap-1 rounded-secondary bg-brand-red-500 py-1 pl-1.5 pr-1 text-xs text-neutral-50 max-w-50"
                            title={item.label}
                          >
                            <span className="truncate">{item.label}</span>

                            <Combobox.ChipRemove className="inline-flex items-center justify-center rounded p-1 text-inherit hover:bg-brand-red-700 cursor-pointer">
                              <FaTimes className="size-2.5" />
                            </Combobox.ChipRemove>
                          </Combobox.Chip>
                        ))}

                      <Combobox.Input
                        id={id}
                        placeholder={value.length > 0 ? "" : placeholder}
                        className="h-6 min-w-16 flex-1 border-0 bg-transparent px-1 text-sm outline-none placeholder:text-neutral-500"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        autoCapitalize="off"
                        data-bwignore="true"
                        data-1p-ignore="true"
                        data-lpignore="true"
                      />

                      <Combobox.Trigger className="absolute right-0 top-0 inline-flex h-8 w-6 items-center justify-center rounded text-brand-red-500 hover:text-brand-red-300 cursor-pointer">
                        <FaChevronDown className="size-3" />
                      </Combobox.Trigger>
                    </>
                  )}
                </Combobox.Value>
              </Combobox.Chips>
            </Combobox.InputGroup>
          </div>
        </div>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-30 outline-none">
            <Combobox.Popup className="z-30 w-(--anchor-width) max-h-[min(20rem,var(--available-height))] overflow-y-auto rounded-secondary bg-neutral-950 border border-neutral-700 py-1 shadow-xl shadow-black/30 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
              <Combobox.Empty>
                <div className="px-3 py-2 text-sm text-neutral-500">
                  Keine Treffer
                </div>
              </Combobox.Empty>

              {hasGroups && groupedItems ? (
                groupedItems.map(([group, groupItems]) => (
                  <div key={group}>
                    <div className="px-3 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {group}
                    </div>

                    {groupItems
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((item) => (
                        <Combobox.Item
                          key={item.value}
                          value={item}
                          className="grid grid-cols-[0.75rem_1fr] items-center gap-2 pl-8 pr-3 py-1.5 text-sm outline-none data-highlighted:bg-neutral-800 cursor-pointer"
                        >
                          <Combobox.ItemIndicator className="col-start-1 text-brand-red-300">
                            <FaCheck className="size-2.5" />
                          </Combobox.ItemIndicator>

                          <div
                            title={item.label}
                            className="col-start-2 truncate"
                          >
                            {item.label}
                          </div>
                        </Combobox.Item>
                      ))}
                  </div>
                ))
              ) : (
                <Combobox.List>
                  {(item: Item) => (
                    <Combobox.Item
                      key={item.value}
                      value={item}
                      className="grid grid-cols-[0.75rem_1fr] items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-neutral-800 cursor-pointer"
                    >
                      <Combobox.ItemIndicator className="col-start-1 text-brand-red-300">
                        <FaCheck className="size-2.5" />
                      </Combobox.ItemIndicator>

                      <div title={item.label} className="col-start-2 truncate">
                        {item.label}
                      </div>
                    </Combobox.Item>
                  )}
                </Combobox.List>
              )}
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
};
