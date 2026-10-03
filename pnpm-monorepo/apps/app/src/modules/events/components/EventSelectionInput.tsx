"use client";

import { formatDate } from "@/modules/common/utils/formatDate";
import { underlineCharacters } from "@/modules/common/utils/underlineCharacters";
import type { EventOption } from "@/modules/events/queries/getAllEvents";
import { api } from "@/trpc/react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import type { Event } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import Fuse, { type FuseResult } from "fuse.js";
import { useRef, useState } from "react";
import { FaCheck, FaTrash } from "react-icons/fa";

interface BaseProps {
  readonly className?: string;
  readonly name: string;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
}

interface SingleProps extends BaseProps {
  readonly multiple?: false;
  readonly defaultValue?: Event["id"];
}

interface MultipleProps extends BaseProps {
  readonly multiple: true;
  readonly defaultValue?: Event["id"][];
}

type Props = SingleProps | MultipleProps;

export const EventSelectionInput = ({
  className,
  name,
  disabled,
  multiple,
  defaultValue,
  autoFocus,
}: Props) => {
  const [query, setQuery] = useState("");

  const { isPending, data: dataAllEvents } =
    api.events.getAllEvents.useQuery(undefined);

  if (isPending || !dataAllEvents)
    return (
      <div className={clsx(className)}>
        <label className="mb-1 block">Event (Name)</label>
        <div className="h-10 animate-pulse rounded-secondary bg-neutral-900" />
      </div>
    );

  const fuse = new Fuse(dataAllEvents, {
    keys: ["name"],
    includeMatches: true,
  });

  const filtered = fuse.search(query, { limit: 10 });

  return (
    <div className={clsx(className)}>
      <label className="mb-1 block">Event (Name)</label>

      {multiple ? (
        <Multiple
          name={name}
          query={query}
          setQuery={setQuery}
          filterResult={filtered}
          defaultValue={
            defaultValue
              ? (defaultValue
                  .map((id) => dataAllEvents?.find((event) => event.id === id))
                  .filter(Boolean) as EventOption[])
              : undefined
          }
          autoFocus={autoFocus}
        />
      ) : (
        <Single
          name={name}
          setQuery={setQuery}
          filterResult={filtered}
          disabled={disabled}
          defaultValue={
            defaultValue
              ? dataAllEvents?.find((item) => item.id === defaultValue)
              : undefined
          }
          autoFocus={autoFocus}
        />
      )}
    </div>
  );
};

interface ComboboxOptionProps {
  readonly result: FuseResult<EventOption>;
  readonly multiple?: boolean;
}

const ComboboxOptionItem = ({
  result,
  multiple = false,
}: ComboboxOptionProps) => {
  const { item: event, matches } = result;

  return (
    <ComboboxOption
      value={event}
      className="group flex cursor-pointer items-baseline gap-2 rounded-secondary px-2 py-1 select-none data-focus:bg-white/20"
    >
      {multiple && (
        <FaCheck className="invisible flex-none text-sm text-brand-red-500 group-data-selected:visible" />
      )}

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <div title={event.name} className="truncate text-sm text-white">
            {underlineCharacters(event.name, matches?.[0].indices)}
          </div>

          <div className="text-xs text-neutral-500">
            {formatDate(event.startTime, "short")}
          </div>
        </div>

        <div title={event.id} className="truncate text-xs text-neutral-500">
          {event.id}
        </div>
      </div>
    </ComboboxOption>
  );
};

type SingleComponentProps = Readonly<{
  name: string;
  setQuery: (query: string) => void;
  filterResult: FuseResult<EventOption>[];
  defaultValue?: EventOption;
  disabled?: boolean;
  autoFocus?: boolean;
}>;

const Single = ({
  name,
  setQuery,
  filterResult,
  defaultValue,
  disabled,
  autoFocus,
}: SingleComponentProps) => {
  const [selected, setSelected] = useState<EventOption | null>(
    defaultValue || null,
  );

  return (
    <>
      <Combobox
        value={selected}
        onChange={(item) => {
          setSelected(item);
        }}
        onClose={() => setQuery("")}
      >
        <ComboboxInput
          autoFocus={autoFocus}
          aria-label="Event"
          displayValue={(item: Event) => item?.name}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-secondary bg-neutral-900 py-2 pr-8 pl-2 focus:outline-hidden disabled:opacity-50 data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
          disabled={disabled}
        />

        <ComboboxOptions
          anchor="bottom"
          className="z-50 w-(--input-width) rounded-b border border-brand-red-500 bg-black p-1 transition duration-100 ease-in [--anchor-gap:var(--spacing-1)] empty:invisible data-leave:data-closed:opacity-0"
        >
          {filterResult.map((result) => (
            <ComboboxOptionItem key={result.item.id} result={result} />
          ))}
        </ComboboxOptions>
      </Combobox>

      {selected && <input type="hidden" name={name} value={selected.id} />}
    </>
  );
};

type MultipleComponentProps = Readonly<{
  name: string;
  query: string;
  setQuery: (query: string) => void;
  filterResult: FuseResult<EventOption>[];
  defaultValue?: EventOption[];
  autoFocus?: boolean;
}>;

const Multiple = ({
  name,
  query,
  setQuery,
  filterResult,
  defaultValue,
  autoFocus,
}: MultipleComponentProps) => {
  const [selected, setSelected] = useState<EventOption[]>(defaultValue || []);

  const popoverPortalRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <Combobox
        multiple
        value={selected}
        onChange={(items) => {
          setSelected(items);
          setQuery("");
        }}
        onClose={() => setQuery("")}
      >
        <ComboboxInput
          autoFocus={autoFocus}
          aria-label="Events"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-secondary bg-neutral-900 py-2 pr-8 pl-2 focus:outline-hidden data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
        />

        <ComboboxOptions
          anchor="bottom"
          className="z-50 w-(--input-width) rounded-b border border-brand-red-500 bg-black p-1 transition duration-100 ease-in [--anchor-gap:var(--spacing-1)] empty:invisible data-leave:data-closed:opacity-0"
        >
          {filterResult.map((result) => (
            <ComboboxOptionItem key={result.item.id} result={result} multiple />
          ))}
        </ComboboxOptions>
      </Combobox>

      <div ref={popoverPortalRef} className="z-10" />

      <p className="mt-1 text-xs text-gray-400">Mehrfachauswahl möglich</p>

      {selected.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {selected.map((item) => (
            <li key={item.id} className="flex items-baseline gap-1">
              <span>{item.name}</span>

              <button
                type="button"
                onClick={() =>
                  setSelected((prev) => prev.filter((c) => c.id !== item.id))
                }
                title="Entfernen"
                className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300"
              >
                <FaTrash className="text-xs" />
              </button>

              <input
                key={item.id}
                type="hidden"
                name={`${name}[]`}
                value={item.id}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
