"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import clsx from "clsx";
import { parseAsString, useQueryState, useQueryStates } from "nuqs";
import {
  useRef,
  useTransition,
  type ChangeEventHandler,
  type FocusEventHandler,
} from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

interface Props {
  readonly name?: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly className?: string;
  readonly resetCursorPagination?: boolean;
}

export const TextSearchFilter = ({
  name = "q",
  label,
  placeholder = "Suche...",
  className,
  resetCursorPagination,
}: Props) => {
  const [isLoading, startTransition] = useTransition();

  const [query, setQuery] = useQueryState(
    name,
    parseAsString.withDefault("").withOptions({
      shallow: false,
      startTransition,
      // The input itself updates optimistically — the debounce only holds
      // back the URL write and with it the server round trip per keystroke
      limitUrlUpdates: {
        method: "debounce",
        timeMs: 500,
      },
    }),
  );

  const [, setPagination] = useQueryStates(cursorPaginationParsers, {
    shallow: true,
    startTransition,
    limitUrlUpdates: {
      method: "throttle",
      timeMs: 500,
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const setValueAndResetPagination = async (newQuery: string | null) => {
    void setQuery(newQuery);

    if (resetCursorPagination) {
      await setPagination({
        cursor: null,
        direction: null,
      });
    }
  };

  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    void setValueAndResetPagination(e.target.value);
  };

  const handleClear = () => {
    void setValueAndResetPagination("");
    inputRef.current?.focus();
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = () => {
    void setValueAndResetPagination(query);
  };

  return (
    <div className={clsx("corners-secondary bg-secondary p-2", className)}>
      <p className="flex items-center gap-1 font-mono text-sm text-white/40 uppercase">
        {label}
        {isLoading && <AsciiSpinner className="text-xs" />}
      </p>

      <div className="relative mt-1">
        <div className="flex items-center gap-1 rounded-secondary border border-neutral-800 bg-neutral-900 p-1 outline-offset-4 outline-interaction-700 focus-within:outline-2">
          <FaSearch className="size-3 flex-none text-white/40" />

          <input
            ref={inputRef}
            type="text"
            value={query ?? ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="h-6 w-full flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            autoCapitalize="off"
            aria-label={label}
            data-bwignore="true"
            data-1p-ignore="true"
            data-lpignore="true"
          />

          {(query ?? "").length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex cursor-pointer items-center justify-center rounded p-1 text-white/40 hover:text-neutral-300"
              aria-label="Suche löschen"
            >
              <FaTimes className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
