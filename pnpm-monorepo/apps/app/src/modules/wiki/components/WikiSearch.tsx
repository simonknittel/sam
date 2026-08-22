"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Link } from "@/modules/common/components/Link";
import { api } from "@/modules/common/utils/api";
import { useDebounce } from "@uidotdev/usehooks";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Fragment, useId, useState } from "react";
import { FaSearch, FaTag } from "react-icons/fa";
import type {
  WikiSearchPageResult,
  WikiSearchTagResult,
} from "../queries/searchWiki";
import { buildWikiPageHref, buildWikiTagHref } from "../utils/wikiPageHref";
import { parseWikiSearchSnippet } from "../utils/wikiSearchSnippet";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";
import { WikiPageIcon } from "./WikiPageIcon";

const MIN_QUERY_LENGTH = 2;

type WikiSearchOption =
  | { readonly type: "tag"; readonly tag: WikiSearchTagResult }
  | { readonly type: "page"; readonly page: WikiSearchPageResult };

interface Props {
  readonly className?: string;
  readonly compact?: boolean;
}

/**
 * Search-as-you-type over all visible wiki pages and all tags, used in the
 * wiki sidebar and on the landing page. Tag results come first and lead to
 * the tag's list page. Page results are permission-filtered server-side and
 * shown in a popover beneath the input, so the surrounding content never
 * shifts. Arrow keys move through the results, Enter opens the active one
 * (or the first when none is active).
 */
export const WikiSearch = ({ className, compact }: Props) => {
  const hrefMode = useWikiPageHrefMode();
  const [query, setQuery] = useState("");

  const optionHref = (option: WikiSearchOption) =>
    option.type === "tag"
      ? buildWikiTagHref(hrefMode, option.tag.id)
      : buildWikiPageHref(hrefMode, option.page);

  const debouncedQuery = useDebounce(query, 300).trim();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const router = useRouter();

  const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const { data, isFetching } = api.wiki.search.useQuery(
    {
      query: debouncedQuery,
      container: hrefMode.container ?? undefined,
      variantId: hrefMode.variantId ?? undefined,
    },
    {
      enabled,
      placeholderData: (previous) => previous,
      refetchOnWindowFocus: false,
    },
  );

  const options: WikiSearchOption[] =
    enabled && data
      ? [
          ...data.tags.map((tag) => ({ type: "tag" as const, tag })),
          ...data.pages.map((page) => ({ type: "page" as const, page })),
        ]
      : [];
  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;
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
    if (options.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      moveActiveIndex(Math.min(activeIndex + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(Math.max(activeIndex - 1, -1));
    } else if (event.key === "Enter") {
      if (!isOpen) return;
      const option = activeOption ?? options[0];
      if (!option) return;
      event.preventDefault();
      setIsOpen(false);
      router.push(optionHref(option));
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
              activeOption ? optionId(activeIndex) : undefined
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
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
              (options.length > 0 ? (
                <ul
                  id={listboxId}
                  role="listbox"
                  aria-label="Suchergebnisse"
                  className="flex flex-col divide-y divide-neutral-800"
                >
                  {options.map((option, index) =>
                    option.type === "tag" ? (
                      <TagResult
                        key={`tag-${option.tag.id}`}
                        id={optionId(index)}
                        href={optionHref(option)}
                        tag={option.tag}
                        isActive={index === activeIndex}
                        onHover={() => setActiveIndex(index)}
                        onSelect={() => setIsOpen(false)}
                      />
                    ) : (
                      <PageResult
                        key={`page-${option.page.id}`}
                        id={optionId(index)}
                        href={optionHref(option)}
                        page={option.page}
                        isActive={index === activeIndex}
                        onHover={() => setActiveIndex(index)}
                        onSelect={() => setIsOpen(false)}
                      />
                    ),
                  )}
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

interface TagResultProps {
  readonly id: string;
  readonly href: string;
  readonly tag: WikiSearchTagResult;
  readonly isActive: boolean;
  readonly onHover: () => void;
  readonly onSelect: () => void;
}

const TagResult = ({
  id,
  href,
  tag,
  isActive,
  onHover,
  onSelect,
}: TagResultProps) => {
  return (
    <li id={id} role="option" aria-selected={isActive} onMouseEnter={onHover}>
      <Link
        href={href}
        onClick={onSelect}
        title={`Alle Seiten mit dem Tag "${tag.name}" anzeigen`}
        className={clsx(
          "flex items-center gap-2 rounded-secondary p-2 focus-visible:outline-2 outline-interaction-700",
          {
            "bg-neutral-800": isActive,
          },
        )}
      >
        <FaTag className="size-3 flex-none text-neutral-500" />
        <span className="font-bold text-sm text-interaction-500">
          {tag.name}
        </span>
        <span className="text-xs text-neutral-500">Tag</span>
      </Link>
    </li>
  );
};

interface PageResultProps {
  readonly id: string;
  readonly href: string;
  readonly page: WikiSearchPageResult;
  readonly isActive: boolean;
  readonly onHover: () => void;
  readonly onSelect: () => void;
}

const PageResult = ({
  id,
  href,
  page,
  isActive,
  onHover,
  onSelect,
}: PageResultProps) => {
  const breadcrumb = page.breadcrumb.join(" › ");

  return (
    <li id={id} role="option" aria-selected={isActive} onMouseEnter={onHover}>
      <Link
        href={href}
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
          {page.iconId && <WikiPageIcon iconId={page.iconId} />}
          {page.title}
        </span>

        <span className="block text-xs text-neutral-400">
          {parseWikiSearchSnippet(page.snippet).map((segment, index) =>
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

        {/**
         * The whole result is one link, so unlike the chips in the page
         * header these don't link to the tag's list page.
         */}
        {page.matchedTags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {page.matchedTags.map((name) => (
              <span
                key={name}
                className="flex items-center gap-1 rounded-secondary bg-neutral-700/50 py-0.5 px-1.5 text-xs text-neutral-300"
              >
                <FaTag className="size-2.5 flex-none text-neutral-500" />
                {name}
              </span>
            ))}
          </span>
        )}
      </Link>
    </li>
  );
};
