"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Link } from "@/modules/common/components/Link";
import { api } from "@/trpc/react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { useDebounce } from "@uidotdev/usehooks";
import clsx from "clsx";
import { Fragment, useState, type ReactNode } from "react";
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

const RESULT_CLASS_NAME =
  "rounded-secondary p-2 outline-interaction-700 hover:bg-neutral-800 focus-visible:outline-2 active:bg-neutral-700 data-highlighted:bg-neutral-800";

interface Props {
  readonly className?: string;
  readonly compact?: boolean;
}

/**
 * Search-as-you-type over all visible wiki pages and all tags, used in the
 * wiki sidebar and on the landing page. Tag results come first and lead to
 * the tag's list page. Page results are permission-filtered server-side and
 * shown in a popup beneath the input, so the surrounding content never
 * shifts. Base UI always highlights a result, by default the first one,
 * thus Enter opens the highlighted result.
 */
export const WikiSearch = ({ className, compact }: Props) => {
  const hrefMode = useWikiPageHrefMode();
  const [query, setQuery] = useState("");
  const [isOpenRequested, setIsOpenRequested] = useState(false);
  const debouncedQuery = useDebounce(query, 300).trim();

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
    },
  );
  const tags = data?.tags ?? [];
  const pages = data?.pages ?? [];

  /**
   * Base UI lets a link result navigate by itself and keeps the popup open.
   * The sidebar survives the navigation, thus the popup must close here.
   */
  const close = () => setIsOpenRequested(false);

  return (
    <div className={className}>
      {compact ? (
        <span className="font-mono text-sm text-white/40 uppercase">
          Seiten durchsuchen
        </span>
      ) : (
        <h2 className="text-center font-mono text-xl font-bold uppercase">
          Seiten durchsuchen
        </h2>
      )}

      <Autocomplete.Root
        items={[...tags, ...pages]}
        // The server sorts and filters the results, thus Base UI must show all of them
        filter={null}
        value={query}
        onValueChange={setQuery}
        open={isOpenRequested && enabled}
        onOpenChange={setIsOpenRequested}
        openOnInputClick
        autoHighlight="always"
      >
        <div
          className={clsx("relative", {
            "mt-1": compact,
            "mt-4": !compact,
          })}
        >
          <FaSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500" />
          {/**
           * While the popup is open, Base UI hides the content around the
           * input from screen readers, thus a surrounding label cannot name it
           */}
          <Autocomplete.Input
            aria-label="Seiten durchsuchen"
            type="search"
            className="w-full rounded-secondary border border-neutral-800 bg-neutral-900 py-2 pr-3 pl-9 outline-interaction-700 hover:border-neutral-700 focus-visible:outline-2"
          />
        </div>

        <Autocomplete.Portal>
          <Autocomplete.Positioner
            sideOffset={8}
            align="start"
            className="z-30 outline-hidden"
          >
            <Autocomplete.Popup className="max-h-[min(var(--available-height),24rem)] w-(--anchor-width) max-w-(--available-width) overflow-y-auto overscroll-contain rounded-secondary border border-neutral-800 bg-neutral-900 p-1 shadow-lg">
              <Autocomplete.Status>
                {isFetching && !data && (
                  <div className="flex justify-center p-4">
                    <AsciiSpinner className="text-2xl text-neutral-500" />
                  </div>
                )}

                {data && tags.length + pages.length === 0 && (
                  <p className="p-2 text-sm text-neutral-400">Keine Treffer.</p>
                )}
              </Autocomplete.Status>

              <Autocomplete.List
                aria-label="Suchergebnisse"
                className="flex flex-col divide-y divide-neutral-800"
              >
                <ResultGroup label="Tags">
                  {tags.map((tag) => (
                    <TagResult
                      key={tag.id}
                      href={buildWikiTagHref(hrefMode, tag.id)}
                      tag={tag}
                      onSelect={close}
                    />
                  ))}
                </ResultGroup>

                <ResultGroup label="Seiten">
                  {pages.map((page) => (
                    <PageResult
                      key={page.id}
                      href={buildWikiPageHref(hrefMode, page)}
                      page={page}
                      onSelect={close}
                    />
                  ))}
                </ResultGroup>
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    </div>
  );
};

interface ResultGroupProps {
  readonly label: string;
  readonly children: ReactNode[];
}

/** The results show their type, thus the label is for screen readers only */
const ResultGroup = ({ label, children }: ResultGroupProps) => {
  if (children.length === 0) return null;

  return (
    <Autocomplete.Group className="flex flex-col divide-y divide-neutral-800">
      <Autocomplete.GroupLabel className="sr-only">
        {label}
      </Autocomplete.GroupLabel>
      {children}
    </Autocomplete.Group>
  );
};

interface TagResultProps {
  readonly href: string;
  readonly tag: WikiSearchTagResult;
  readonly onSelect: () => void;
}

const TagResult = ({ href, tag, onSelect }: TagResultProps) => {
  return (
    <Autocomplete.Item
      value={tag}
      render={<Link href={href} />}
      onClick={onSelect}
      title={`Alle Seiten mit dem Tag "${tag.name}" anzeigen`}
      className={clsx(RESULT_CLASS_NAME, "flex items-center gap-2")}
    >
      <FaTag className="size-3 flex-none text-neutral-500" />
      <span className="text-sm font-bold text-interaction-500">{tag.name}</span>
      <span className="text-xs text-neutral-500">Tag</span>
    </Autocomplete.Item>
  );
};

interface PageResultProps {
  readonly href: string;
  readonly page: WikiSearchPageResult;
  readonly onSelect: () => void;
}

const PageResult = ({ href, page, onSelect }: PageResultProps) => {
  const breadcrumb = page.breadcrumb.join(" › ");

  return (
    <Autocomplete.Item
      value={page}
      render={<Link href={href} />}
      onClick={onSelect}
      className={clsx(RESULT_CLASS_NAME, "block")}
    >
      {breadcrumb && (
        <span
          className="block truncate text-xs text-neutral-500"
          title={breadcrumb}
        >
          {breadcrumb}
        </span>
      )}

      <span className="flex items-center gap-2 text-sm font-bold text-interaction-500">
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
              className="flex items-center gap-1 rounded-secondary bg-neutral-700/50 px-1.5 py-0.5 text-xs text-neutral-300"
            >
              <FaTag className="size-2.5 flex-none text-neutral-500" />
              {name}
            </span>
          ))}
        </span>
      )}
    </Autocomplete.Item>
  );
};
