"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  SpynetSearchStatus,
  useSpynetSearch,
} from "@/modules/spynet/hooks/useSpynetSearch";
import { type SpynetSearchHit } from "@/modules/spynet/utils/spynetSearch";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { useState, type ReactNode } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { SpynetSearchAutocompleteHit } from "./SpynetSearchAutocompleteHit";

export const SpynetSearchAutocomplete = () => {
  const [query, setQuery] = useState("");
  const [isOpenRequested, setIsOpenRequested] = useState(false);
  const { status, hits } = useSpynetSearch(query);

  const handleValueChange = (value: string) => {
    setQuery(value);

    // The search waits for the debounce, thus without this the popup shows the
    // hits of the previous query for a short time after the input is cleared
    if (value.trim() === "") setIsOpenRequested(false);
  };

  return (
    <Autocomplete.Root
      items={hits}
      // The server sorts and filters the hits, thus Base UI must show all of them
      filter={null}
      value={query}
      onValueChange={handleValueChange}
      open={isOpenRequested && status !== SpynetSearchStatus.Idle}
      onOpenChange={setIsOpenRequested}
      openOnInputClick
    >
      <Autocomplete.InputGroup className="flex items-center w-full h-11 rounded-secondary bg-neutral-800 border border-transparent hover:border-neutral-600 focus-within:border-white focus-within:hover:border-white">
        <FaSearch
          aria-hidden
          className="flex-none size-4 ml-3 mr-2 text-brand-red-500"
        />

        <Autocomplete.Input
          aria-label="Spynet durchsuchen"
          placeholder="Suche"
          className="h-full w-full min-w-0 flex-1 bg-transparent text-white placeholder:text-neutral-500 outline-hidden"
          autoCorrect="off"
          spellCheck="false"
          autoCapitalize="off"
          data-bwignore="true"
          data-1p-ignore="true"
          data-lpignore="true"
        />

        <Autocomplete.Clear
          aria-label="Suche löschen"
          className="flex-none flex items-center h-full px-3 text-neutral-500 cursor-pointer outline-hidden hover:text-brand-red-500 focus-visible:text-brand-red-500 active:text-brand-red-700"
        >
          <FaTimes className="size-4" />
        </Autocomplete.Clear>
      </Autocomplete.InputGroup>

      <Autocomplete.Portal>
        <Autocomplete.Positioner
          sideOffset={8}
          align="start"
          className="z-30 outline-hidden"
        >
          <Autocomplete.Popup className="w-(--anchor-width) max-w-(--available-width) max-h-[min(var(--available-height),40rem)] overflow-y-auto overscroll-contain rounded-secondary bg-neutral-800 shadow-lg shadow-black/50">
            <Autocomplete.Status>
              <StatusMessage status={status} hasHits={hits.length > 0} />
            </Autocomplete.Status>

            <Autocomplete.List>
              {(hit: SpynetSearchHit) => (
                <SpynetSearchAutocompleteHit key={hit.id} hit={hit} />
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
};

interface StatusMessageProps {
  readonly status: SpynetSearchStatus;
  readonly hasHits: boolean;
}

const StatusMessage = ({ status, hasHits }: StatusMessageProps) => {
  switch (status) {
    case SpynetSearchStatus.Idle:
      return null;

    case SpynetSearchStatus.Loading:
      return (
        <StatusRow>
          <AsciiSpinner className="motion-reduce:hidden" />
          Suche läuft …
        </StatusRow>
      );

    case SpynetSearchStatus.Error:
      return <StatusRow>Die Suche ist fehlgeschlagen.</StatusRow>;

    case SpynetSearchStatus.Success:
      if (hasHits) return null;
      return <StatusRow>Keine Ergebnisse</StatusRow>;

    default:
      throw new Error(`Unknown status: ${status satisfies never}`);
  }
};

interface StatusRowProps {
  readonly children: ReactNode;
}

const StatusRow = ({ children }: StatusRowProps) => {
  return (
    <div className="flex items-center gap-2 p-2 text-neutral-500">
      {children}
    </div>
  );
};
