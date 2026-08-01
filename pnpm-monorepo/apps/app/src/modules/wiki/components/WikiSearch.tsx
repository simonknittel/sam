"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Link } from "@/modules/common/components/Link";
import { api } from "@/modules/common/utils/api";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useState } from "react";
import { FaSearch } from "react-icons/fa";
import type { WikiSearchResult } from "../queries/searchWikiPages";
import { parseWikiSearchSnippet } from "../utils/wikiSearchSnippet";
import { WikiPageIcon } from "./WikiPageIcon";

const MIN_QUERY_LENGTH = 2;

interface Props {
  readonly className?: string;
  readonly compact?: boolean;
}

/**
 * Search-as-you-type over all visible wiki pages, used in the wiki sidebar
 * and on the landing page. Results are permission-filtered server-side and
 * shown in a popover beneath the input, so the surrounding content never
 * shifts. Arrow keys move through the results, Enter opens the active one
 * (or the first when none is active).
 */
export const WikiSearch = ({ className, compact }: Props) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setActiveIndex(-1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const { data, isFetching } = api.wiki.searchPages.useQuery(
    { query: debouncedQuery },
    {
      enabled,
      placeholderData: (previous) => previous,
      refetchOnWindowFocus: false,
    },
  );

  const results = enabled ? (data ?? []) : [];
  const activeResult = activeIndex >= 0 ? results[activeIndex] : undefined;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  /**
   * The option element already exists when the key is pressed — only its
   * highlight follows with the re-render — so scrolling it into view can
   * happen right in the handler.
   */
  const moveActiveIndex = (next: number) => {
    setActiveIndex(next);
    if (next >= 0)
      document
        .getElementById(optionId(next))
        ?.scrollIntoView({ block: "nearest" });
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      moveActiveIndex(Math.min(activeIndex + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(Math.max(activeIndex - 1, -1));
    } else if (event.key === "Enter") {
      if (!isOpen) return;
      const result = activeResult ?? results[0];
      if (!result) return;
      event.preventDefault();
      setIsOpen(false);
      router.push(`/app/wiki/${result.id}/${result.slug}`);
    }
  };

  return (
    <div
      className={className}
      /**
       * Focus-within tracking: results are links, so clicking one keeps
       * the focus inside this container until the navigation happens —
       * unlike an input blur handler, this doesn't close the popover
       * before the click lands.
       */
      onFocus={() => setIsOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setIsOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsOpen(false);
      }}
    >
      <div className="relative">
        {compact ? (
          <span className="font-mono uppercase text-white/40 text-sm">
            Seiten durchsuchen
          </span>
        ) : (
          <h2 className="font-mono uppercase font-bold text-xl text-center">
            Seiten durchsuchen
          </h2>
        )}

        <label
          className={clsx("relative block", {
            "mt-1": compact,
            "mt-4": !compact,
          })}
        >
          <span className="sr-only">Seiten durchsuchen</span>
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            role="combobox"
            aria-expanded={isOpen && enabled}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeResult ? optionId(activeIndex) : undefined
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            className="w-full rounded-secondary border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-3 focus-visible:outline-2 outline-interaction-700"
          />
        </label>

        {isOpen && enabled && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-secondary border border-neutral-800 bg-neutral-900 p-1 shadow-lg">
            {isFetching && !data && (
              <div className="flex justify-center p-4">
                <AsciiSpinner className="text-2xl text-neutral-500" />
              </div>
            )}

            {data &&
              (results.length > 0 ? (
                <ul
                  id={listboxId}
                  role="listbox"
                  aria-label="Suchergebnisse"
                  className="flex flex-col divide-y divide-neutral-800"
                >
                  {results.map((result, index) => (
                    <SearchResult
                      key={result.id}
                      id={optionId(index)}
                      result={result}
                      isActive={index === activeIndex}
                      onHover={() => setActiveIndex(index)}
                      onSelect={() => setIsOpen(false)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="p-2 text-sm text-neutral-400">Keine Treffer.</p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface SearchResultProps {
  readonly id: string;
  readonly result: WikiSearchResult;
  readonly isActive: boolean;
  readonly onHover: () => void;
  readonly onSelect: () => void;
}

const SearchResult = ({
  id,
  result,
  isActive,
  onHover,
  onSelect,
}: SearchResultProps) => {
  const breadcrumb = result.breadcrumb.join(" › ");

  return (
    <li id={id} role="option" aria-selected={isActive} onMouseEnter={onHover}>
      <Link
        href={`/app/wiki/${result.id}/${result.slug}`}
        onClick={onSelect}
        className={clsx(
          "block rounded-secondary p-2 focus-visible:outline-2 outline-interaction-700",
          {
            "bg-neutral-800": isActive,
          },
        )}
      >
        {breadcrumb && (
          <span
            className="block truncate text-xs text-neutral-500"
            title={breadcrumb}
          >
            {breadcrumb}
          </span>
        )}

        <span className="flex items-center gap-2 font-bold text-sm text-interaction-500">
          {result.iconId && <WikiPageIcon iconId={result.iconId} />}
          {result.title}
        </span>

        <span className="block text-xs text-neutral-400">
          {parseWikiSearchSnippet(result.snippet).map((segment, index) =>
            segment.highlighted ? (
              <mark
                key={index}
                className="bg-transparent font-bold text-neutral-100"
              >
                {segment.text}
              </mark>
            ) : (
              <Fragment key={index}>{segment.text}</Fragment>
            ),
          )}
        </span>
      </Link>
    </li>
  );
};
