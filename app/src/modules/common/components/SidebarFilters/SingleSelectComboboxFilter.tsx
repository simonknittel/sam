"use client";

import { Combobox } from "@base-ui/react/combobox";
import clsx from "clsx";
import { useTopLoader } from "nextjs-toploader";
import { parseAsString, useQueryState, useQueryStates } from "nuqs";
import { useCallback, useEffect, useId, useTransition } from "react";
import { FaCheck, FaChevronDown } from "react-icons/fa";
import { cursorPaginationParsers } from "../../CursorPagination/cursorPaginationParsers";

interface Item {
  readonly value: string;
  readonly label: string;
}

interface Props {
  readonly name: string;
  readonly label: string;
  readonly items: Item[];
  readonly className?: string;
  readonly placeholder?: string;
  readonly resetCursorPagination?: boolean;
}

export const SingleSelectComboboxFilter = ({
  name,
  label,
  items,
  className,
  placeholder,
  resetCursorPagination,
}: Props) => {
  const id = useId();
  const [isLoading, startTransition] = useTransition();

  const [selectedValue, setSelectedValue] = useQueryState(
    name,
    parseAsString.withDefault(items[0]?.value ?? "").withOptions({
      shallow: false,
      startTransition,
    }),
  );

  const [, setPagination] = useQueryStates(cursorPaginationParsers, {
    shallow: false,
    startTransition,
  });

  const selectedItem =
    items.find((item) => item.value === selectedValue) ?? null;

  const setValueAndResetPagination = useCallback(
    async (newValue: Item | null) => {
      await setSelectedValue(newValue?.value ?? null);

      if (resetCursorPagination) {
        await setPagination({
          cursor: null,
          direction: null,
        });
      }
    },
    [setPagination, setSelectedValue, resetCursorPagination],
  );

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) {
      loader.start();
    }
  }, [loader, isLoading]);

  return (
    <div className={clsx("bg-secondary p-2 corners-secondary", className)}>
      <p className="text-sm text-neutral-500">{label}</p>

      <Combobox.Root
        items={items}
        value={selectedItem}
        onValueChange={setValueAndResetPagination}
      >
        <div className="mt-1">
          <div className="p-1 rounded-secondary bg-neutral-900 border border-neutral-800 focus-visible:outline-2 outline-interaction-700 outline-offset-4 relative">
            <Combobox.InputGroup>
              <Combobox.Input
                id={id}
                placeholder={placeholder}
                className="h-6 w-full min-w-16 flex-1 border-0 bg-transparent px-1 text-sm outline-none placeholder:text-neutral-500"
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
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
};
