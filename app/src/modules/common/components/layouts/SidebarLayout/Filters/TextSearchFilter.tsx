"use client";

import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import clsx from "clsx";
import { parseAsString, useQueryState, useQueryStates } from "nuqs";
import {
  useRef,
  useTransition,
  type ChangeEventHandler,
  type FocusEventHandler,
} from "react";
import { FaSearch, FaSpinner, FaTimes } from "react-icons/fa";

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
    <div className={clsx("bg-secondary p-2 corners-secondary", className)}>
      <p className="text-sm text-white/40 font-mono uppercase flex gap-1 items-center">
        {label}
        {isLoading && <FaSpinner className="animate-spin text-xs" />}
      </p>

      <div className="mt-1 relative">
        <div className="p-1 rounded-secondary bg-neutral-900 border border-neutral-800 focus-within:outline-2 outline-interaction-700 outline-offset-4 flex items-center gap-1">
          <FaSearch className="size-3 text-white/40 flex-none" />

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
              className="inline-flex items-center justify-center rounded p-1 text-white/40 hover:text-neutral-300 cursor-pointer"
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
