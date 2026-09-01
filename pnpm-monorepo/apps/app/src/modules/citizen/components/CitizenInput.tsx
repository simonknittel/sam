"use client";

import Button from "@/modules/common/components/Button";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { underlineCharacters } from "@/modules/common/utils/underlineCharacters";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { api } from "@/trpc/react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import type { Entity } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import Fuse, { type FuseResult } from "fuse.js";
import { useState } from "react";
import { FaCheck, FaTrash, FaUsers } from "react-icons/fa";

/** What the picker offers: `getCitizens()` returns exactly this */
type CitizenOption = Pick<Entity, "id" | "handle">;

interface BaseProps {
  readonly className?: string;
  readonly name: string;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  /**
   * Narrows the offered citizens to this set, including the role shortcuts.
   * Omit to offer every citizen.
   */
  readonly selectableCitizenIds?: readonly Entity["id"][];
}

interface SingleProps extends BaseProps {
  readonly multiple?: false;
  readonly defaultValue?: Entity["id"];
}

interface MultipleProps extends BaseProps {
  readonly multiple: true;
  readonly defaultValue?: Entity["id"][];
}

type Props = SingleProps | MultipleProps;

export const CitizenInput = ({
  className,
  name,
  disabled,
  multiple,
  defaultValue,
  autoFocus,
  selectableCitizenIds,
}: Props) => {
  const [query, setQuery] = useState("");

  const { isPending, data: dataAllCitizens } =
    api.citizens.getAllCitizens.useQuery(undefined, {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  if (isPending || !dataAllCitizens)
    return (
      <div className={clsx(className)}>
        <label className="block mb-1">Citizen (Handle)</label>
        <div className="h-10 animate-pulse rounded-secondary bg-neutral-900" />
      </div>
    );

  const selectableIds = selectableCitizenIds
    ? new Set(selectableCitizenIds)
    : null;
  const selectableCitizens = selectableIds
    ? dataAllCitizens.filter((citizen) => selectableIds.has(citizen.id))
    : dataAllCitizens;

  const fuse = new Fuse(selectableCitizens, {
    keys: ["handle"],
    includeMatches: true,
  });

  /**
   * Fuse answers an empty pattern with every record, which would leave the
   * option list permanently open on top of whatever sits below the picker —
   * a pick clears the query, so the list would refill right after each one.
   * An empty result is what the list's `empty:invisible` expects.
   */
  const filteredCitizens = query.trim()
    ? fuse.search(query, { limit: 10 })
    : [];

  return (
    <div className={clsx(className)}>
      <label className="block mb-1">Citizen (Handle)</label>

      {multiple ? (
        <Multiple
          name={name}
          query={query}
          setQuery={setQuery}
          filterResult={filteredCitizens}
          defaultValue={
            defaultValue
              ? (defaultValue
                  .map((id) =>
                    selectableCitizens.find((citizen) => citizen.id === id),
                  )
                  .filter(Boolean) as CitizenOption[])
              : undefined
          }
          selectableIds={selectableIds}
          autoFocus={autoFocus}
        />
      ) : (
        <Single
          name={name}
          setQuery={setQuery}
          filterResult={filteredCitizens}
          disabled={disabled}
          defaultValue={
            defaultValue
              ? selectableCitizens.find(
                  (citizen) => citizen.id === defaultValue,
                )
              : undefined
          }
          autoFocus={autoFocus}
        />
      )}
    </div>
  );
};

interface ComboboxOptionProps {
  readonly result: FuseResult<CitizenOption>;
}

const ComboboxOptionItem = ({ result }: ComboboxOptionProps) => {
  const { item: citizen, matches } = result;

  return (
    <ComboboxOption
      value={citizen}
      className="group flex cursor-pointer items-center gap-2 rounded-secondary py-1 px-2 select-none data-focus:bg-white/20"
    >
      <FaCheck className="invisible group-data-selected:visible text-sm text-brand-red-500" />

      <div className="text-white text-sm">
        {underlineCharacters(citizen.handle!, matches?.[0].indices)}
      </div>

      <div className="text-xs text-neutral-500">{citizen.id}</div>
    </ComboboxOption>
  );
};

type SingleComponentProps = Readonly<{
  name: string;
  setQuery: (query: string) => void;
  filterResult: FuseResult<CitizenOption>[];
  defaultValue?: CitizenOption;
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
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenOption | null>(
    defaultValue || null,
  );

  return (
    <>
      <Combobox
        value={selectedCitizen}
        onChange={(citizen) => {
          setSelectedCitizen(citizen);
        }}
        onClose={() => setQuery("")}
      >
        <ComboboxInput
          autoFocus={autoFocus}
          aria-label="Citizen"
          displayValue={(citizen: CitizenOption) => citizen?.handle || ""}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-secondary bg-neutral-900 py-2 pr-8 pl-2 focus:outline-hidden data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25 disabled:opacity-50"
          disabled={disabled}
        />

        <ComboboxOptions
          anchor="bottom"
          // Anchored options default to modal, which marks the rest of an
          // enclosing dialog inert while the popup is open — in multiple
          // mode the popup stays open after selecting, leaving the other
          // form fields unreachable
          modal={false}
          className="w-(--input-width) rounded-b border border-brand-red-500 bg-black p-1 [--anchor-gap:var(--spacing-1)] empty:invisible transition duration-100 ease-in data-leave:data-closed:opacity-0 z-50"
        >
          {filterResult.map((result) => (
            <ComboboxOptionItem key={result.item.id} result={result} />
          ))}
        </ComboboxOptions>
      </Combobox>

      {selectedCitizen && (
        <input type="hidden" name={name} value={selectedCitizen.id} />
      )}
    </>
  );
};

type MultipleComponentProps = Readonly<{
  name: string;
  query: string;
  setQuery: (query: string) => void;
  filterResult: FuseResult<CitizenOption>[];
  defaultValue?: CitizenOption[];
  selectableIds: ReadonlySet<Entity["id"]> | null;
  autoFocus?: boolean;
}>;

const Multiple = ({
  name,
  query,
  setQuery,
  filterResult,
  defaultValue,
  selectableIds,
  autoFocus,
}: MultipleComponentProps) => {
  const { isPending, data: dataCitizensGroupedByVisibleRoles } =
    api.citizens.getCitizensGroupedByVisibleRoles.useQuery(undefined, {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  const [selectedCitizens, setSelectedCitizens] = useState<CitizenOption[]>(
    defaultValue || [],
  );

  const handleSelectRole = (roleId: string) => {
    if (!dataCitizensGroupedByVisibleRoles) return;

    const citizensOfRole =
      dataCitizensGroupedByVisibleRoles.get(roleId)?.citizens || [];

    setSelectedCitizens(
      selectableIds
        ? citizensOfRole.filter((citizen) => selectableIds.has(citizen.id))
        : citizensOfRole,
    );
  };
  return (
    <>
      <div className="flex gap-2">
        <Combobox
          multiple
          value={selectedCitizens}
          onChange={(citizens) => {
            setSelectedCitizens(citizens);
            setQuery("");
          }}
          onClose={() => setQuery("")}
        >
          <ComboboxInput
            autoFocus={autoFocus}
            aria-label="Citizens"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-secondary bg-neutral-900 py-2 pr-8 pl-2 focus:outline-hidden data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
          />

          <ComboboxOptions
            anchor="bottom"
            // See the single-mode options above
            modal={false}
            className="w-(--input-width) rounded-b border border-brand-red-500 bg-black p-1 [--anchor-gap:var(--spacing-1)] empty:invisible transition duration-100 ease-in data-leave:data-closed:opacity-0 z-50"
          >
            {filterResult.map((result) => (
              <ComboboxOptionItem key={result.item.id} result={result} />
            ))}
          </ComboboxOptions>
        </Combobox>

        <PopoverBaseUI
          title="Citizens einer Rolle auswählen"
          trigger={<FaUsers />}
          triggerRender={
            <Button
              type="button"
              title="Rolle auswählen"
              variant="secondary"
              iconOnly
              className="flex-none"
              disabled={isPending}
            />
          }
          openOnHover={false}
          positionerClassName="z-40"
          childrenClassName="max-h-96 overflow-auto"
        >
          <div className="flex flex-col gap-2">
            {dataCitizensGroupedByVisibleRoles
              ? Array.from(dataCitizensGroupedByVisibleRoles.values())
                  .toSorted((a, b) => a.role.name.localeCompare(b.role.name))
                  .map(({ role }) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectRole(role.id)}
                      className="group"
                    >
                      <SingleRoleBadge
                        roleId={role.id}
                        showPlaceholder
                        className="bg-transparent group-hover:bg-neutral-700/50 group-focus-visible:bg-neutral-700/50"
                      />
                    </button>
                  ))
              : null}
          </div>
        </PopoverBaseUI>
      </div>

      <p className="text-xs mt-1 text-gray-400">Mehrfachauswahl möglich</p>

      {selectedCitizens.length > 0 && (
        <ul className="mt-2 flex gap-x-3 gap-y-1 flex-wrap">
          {selectedCitizens.map((citizen) => (
            <li key={citizen.id} className="flex items-baseline gap-1">
              <CitizenLink citizen={citizen} />

              <button
                type="button"
                onClick={() =>
                  setSelectedCitizens((prev) =>
                    prev.filter((c) => c.id !== citizen.id),
                  )
                }
                title="Entfernen"
                className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 enabled:cursor-pointer"
              >
                <FaTrash className="text-xs" />
              </button>

              <input
                key={citizen.id}
                type="hidden"
                name={`${name}[]`}
                value={citizen.id}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
