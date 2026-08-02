import {
  createWikiHeadingIdAssigner,
  getWikiEditorExtensions,
  isWikiPageContentEmpty,
  resolveWikiCitizenMention,
  resolveWikiVariantLink,
  wikiPageIndexConfigKey,
  type WikiLinkedVariant,
  type WikiMentionedCitizen,
  type WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { renderToReactElement } from "@tiptap/static-renderer";
import clsx from "clsx";
import { createElement, type CSSProperties, type ReactNode } from "react";
import { getWikiTwitchParentHost } from "../utils/getWikiTwitchParentHost";
import { WikiAttachmentCard } from "./WikiAttachmentCard";
import { WikiCitizenMentionChip } from "./WikiCitizenMentionNodeView";
import {
  WikiPageIndexList,
  type WikiPageIndexEntry,
} from "./WikiPageIndexList";
import { WikiVariantLinkChip } from "./WikiVariantLinkNodeView";
import "./wikiEditor.css";

type StaticContent = Parameters<typeof renderToReactElement>[0]["content"];

/**
 * Mirrors TableCell's/TableHeader's renderHTML, but with React's camelCased
 * span props and the align attribute as a style object — the default
 * mapping passes the HTML attribute names (colspan/rowspan) through
 * verbatim, which React warns about.
 */
const tableCellProps = (node: ProseMirrorNode) => {
  const { colspan, rowspan, colwidth, align } = node.attrs;
  return {
    colSpan: colspan as number,
    rowSpan: rowspan as number,
    colwidth: (colwidth as number[] | null)?.join(",") ?? undefined,
    style: align
      ? { textAlign: align as CSSProperties["textAlign"] }
      : undefined,
  };
};

/**
 * Plain helper (not a component) so the render callbacks may keep the
 * stateful heading id assigner — headings get the same anchor ids in the
 * same document order as the live editor (see wikiHeadingIds.ts in the
 * wiki-editor package), so `#anchor` deep links stay stable.
 */
const renderWikiPageContent = (
  content: StaticContent,
  iframeAllowlist: readonly string[],
  linkablePages: Readonly<Record<string, WikiPageLinkedPage>>,
  mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>,
  linkedVariants: Readonly<Record<string, WikiLinkedVariant>>,
  pageIndexes: Readonly<Record<string, readonly WikiPageIndexEntry[]>>,
  pageId: string | undefined,
) => {
  const nextHeadingId = createWikiHeadingIdAssigner();

  return renderToReactElement({
    content,
    extensions: getWikiEditorExtensions({
      twitchParentHost: getWikiTwitchParentHost(),
      iframeAllowlist,
      pages: linkablePages,
      citizens: mentionedCitizens,
      variants: linkedVariants,
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
        tableCell: ({ node, children }) =>
          createElement("td", tableCellProps(node), children as ReactNode),
        tableHeader: ({ node, children }) =>
          createElement("th", tableCellProps(node), children as ReactNode),
        /**
         * Unlike the node's renderHTML, the card adds the report button
         * next to the download link — same as the read-only editor's node
         * view.
         */
        wikiAttachment: ({ node }) => (
          <WikiAttachmentCard
            uploadId={String(node.attrs.uploadId ?? "")}
            fileName={String(node.attrs.fileName ?? "")}
            size={(node.attrs.size as number | null) ?? null}
            mimeType={(node.attrs.mimeType as string | null) ?? null}
            pageId={pageId}
          />
        ),
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
         * Unlike the node's renderHTML, the chip renders the fleet app's
         * variant component — same as the editor node view.
         */
        wikiVariantLink: ({ node }) => (
          <WikiVariantLinkChip
            resolved={resolveWikiVariantLink(linkedVariants, node.attrs)}
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
  /** Page the content belongs to — without it the attachment report buttons are omitted */
  readonly pageId?: string;
  /** Hostnames generic iframes may embed (WikiSetting.iframeAllowlist) */
  readonly iframeAllowlist: readonly string[];
  /** Pages the viewer can see, by id — for internal page links */
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  /** Current handles of the citizens mentioned on the page, by id */
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  /** Current names and manufacturer logos of the variants linked on the page, by id */
  readonly linkedVariants: Readonly<Record<string, WikiLinkedVariant>>;
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
  pageId,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
  linkedVariants,
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
    linkedVariants,
    pageIndexes,
    pageId,
  );

  return (
    // The data attribute scopes the static-only geometry fixes (wikiEditor.css)
    <div
      className={clsx("prose prose-invert max-w-none", className)}
      data-wiki-static-content=""
    >
      {rendered}
    </div>
  );
};
