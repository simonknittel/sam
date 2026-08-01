import {
  createWikiHeadingIdAssigner,
  getWikiEditorExtensions,
  isWikiPageContentEmpty,
  resolveWikiCitizenMention,
  wikiPageIndexConfigKey,
  type WikiMentionedCitizen,
  type WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import { renderToReactElement } from "@tiptap/static-renderer";
import clsx from "clsx";
import { createElement, type ReactNode } from "react";
import { getWikiTwitchParentHost } from "../utils/getWikiTwitchParentHost";
import { WikiCitizenMentionChip } from "./WikiCitizenMentionNodeView";
import {
  WikiPageIndexList,
  type WikiPageIndexEntry,
} from "./WikiPageIndexList";
import "./wikiEditor.css";

type StaticContent = Parameters<typeof renderToReactElement>[0]["content"];

/**
 * Plain helper (not a component) so the render callbacks may keep the
 * stateful heading id assigner — headings get the same anchor ids in the
 * same document order as the TOC (see wikiHeadingIds.ts in the wiki-editor
 * package).
 */
const renderWikiPageContent = (
  content: StaticContent,
  iframeAllowlist: readonly string[],
  linkablePages: Readonly<Record<string, WikiPageLinkedPage>>,
  mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>,
  pageIndexes: Readonly<Record<string, readonly WikiPageIndexEntry[]>>,
) => {
  const nextHeadingId = createWikiHeadingIdAssigner();

  return renderToReactElement({
    content,
    extensions: getWikiEditorExtensions({
      twitchParentHost: getWikiTwitchParentHost(),
      iframeAllowlist,
      pages: linkablePages,
      citizens: mentionedCitizens,
    }),
    options: {
      nodeMapping: {
        heading: ({ node, children }) => {
          const level = Math.min(Math.max(Number(node.attrs.level) || 1, 1), 6);
          return createElement(
            `h${level}`,
            { id: nextHeadingId(node.textContent) ?? undefined },
            children as ReactNode,
          );
        },
        /**
         * Mirrors TaskItem's renderHTML DOM, but with defaultChecked +
         * disabled — the default mapping emits a controlled `checked` prop
         * without onChange, which React warns about.
         */
        taskItem: ({ node, children }) => {
          const checked = Boolean(node.attrs.checked);
          return (
            <li data-type="taskItem" data-checked={checked ? "true" : "false"}>
              <label>
                <input type="checkbox" defaultChecked={checked} disabled />
                <span />
              </label>
              <div>{children as ReactNode}</div>
            </li>
          );
        },
        /**
         * Unlike the node's renderHTML, the chip adds the citizen hover
         * popover around the mention link — same as the editor node view.
         */
        wikiCitizenMention: ({ node }) => (
          <WikiCitizenMentionChip
            resolved={resolveWikiCitizenMention(mentionedCitizens, node.attrs)}
          />
        ),
        /**
         * Renders the page list pre-resolved by the server for this viewer
         * (see resolveWikiPageIndex) instead of the node's placeholder.
         */
        wikiPageIndex: ({ node }) => (
          <WikiPageIndexList
            entries={pageIndexes[wikiPageIndexConfigKey(node.attrs)] ?? []}
          />
        ),
      },
    },
  });
};

interface Props {
  readonly className?: string;
  readonly content: unknown;
  /** Hostnames generic iframes may embed (WikiSetting.iframeAllowlist) */
  readonly iframeAllowlist: readonly string[];
  /** Pages the viewer can see, by id — for internal page links */
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  /** Current handles of the citizens mentioned on the page, by id */
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  /**
   * Resolved page lists of the page-index nodes on this page, keyed by
   * `wikiPageIndexConfigKey`
   */
  readonly pageIndexes?: Readonly<
    Record<string, readonly WikiPageIndexEntry[]>
  >;
}

/**
 * Static render of a page's Tiptap JSON for readers without edit
 * permission.
 */
export const WikiPageStaticContent = ({
  className,
  content,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
  pageIndexes = {},
}: Props) => {
  // Covers docs emptied in the editor too (one empty paragraph, not null)
  if (!content || isWikiPageContentEmpty(content))
    return (
      <div className={clsx("prose prose-invert max-w-none", className)}>
        {/* Same box as the editor's empty paragraph + Placeholder, so the
            swap to the connected editor doesn't shift the page */}
        <p className="text-center text-neutral-500">
          Diese Seite hat noch keinen Inhalt.
        </p>
      </div>
    );

  const rendered = renderWikiPageContent(
    content,
    iframeAllowlist,
    linkablePages,
    mentionedCitizens,
    pageIndexes,
  );

  return (
    <div className={clsx("prose prose-invert max-w-none", className)}>
      {rendered}
    </div>
  );
};
