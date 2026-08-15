import {
  createWikiHeadingIdAssigner,
  getWikiEditorExtensions,
  isWikiPageContentEmpty,
  normalizeWikiRoleCitizensConfig,
  resolveWikiCitizenMention,
  resolveWikiVariantLink,
  WIKI_FULL_WIDTH,
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
import type { WikiImageDimensions } from "../utils/wikiImageRendering";
import { withoutWikiTrailingEmptyParagraph } from "../utils/wikiTrailingParagraph";
import { WikiAttachmentCard } from "./WikiAttachmentCard";
import { wikiBlockLayoutStyle } from "./wikiBlockLayoutStyle";
import { WikiCitizenMentionChip } from "./WikiCitizenMentionNodeView";
import { WikiContentImage } from "./WikiContentImage";
import "./wikiEditor.css";
import {
  WikiPageIndexList,
  type WikiPageIndexEntry,
} from "./WikiPageIndexList";
import {
  WikiRoleCitizensList,
  type WikiRoleCitizen,
} from "./WikiRoleCitizensList";
import { WikiVariantLinkChip } from "./WikiVariantLinkNodeView";

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
  roleCitizens: Readonly<Record<string, readonly WikiRoleCitizen[]>>,
  imageDimensions: Readonly<Record<string, WikiImageDimensions>>,
  pageId: string | undefined,
) => {
  const nextHeadingId = createWikiHeadingIdAssigner();
  // The document's first image is a likely LCP candidate — load it eagerly
  let isFirstImage = true;

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
        /**
         * The mapping replaces the node's renderHTML entirely, so the
         * attribute styles (text alignment, width/position) are rebuilt
         * here by hand.
         */
        heading: ({ node, children }) => {
          const level = Math.min(Math.max(Number(node.attrs.level) || 1, 1), 6);
          const textAlign = node.attrs.textAlign as
            CSSProperties["textAlign"] | null;
          const widthPx: unknown = node.attrs.widthPx;
          const align: unknown = node.attrs.align;
          return createElement(
            `h${level}`,
            {
              id: nextHeadingId(node.textContent) ?? undefined,
              // The data attributes keep copy/paste back into the editor lossless
              "data-width-px":
                typeof widthPx === "number" || widthPx === WIKI_FULL_WIDTH
                  ? widthPx
                  : undefined,
              "data-align":
                align === "left" || align === "right" ? align : undefined,
              style: textAlign
                ? { textAlign, ...wikiBlockLayoutStyle(node.attrs) }
                : wikiBlockLayoutStyle(node.attrs),
            },
            children as ReactNode,
          );
        },
        /**
         * Mirrors TaskItem's renderHTML DOM, but with defaultChecked — the
         * default mapping emits a controlled `checked` prop without
         * onChange, which React warns about. The box is deliberately not
         * `disabled`: the editor's read-only view renders an enabled one
         * (it just reverts the toggle), and a disabled box paints in the
         * greyed-out system colors, so the swap would recolor every task.
         * wikiEditor.css makes it inert instead.
         */
        taskItem: ({ node, children }) => {
          const checked = Boolean(node.attrs.checked);
          return (
            <li data-type="taskItem" data-checked={checked ? "true" : "false"}>
              <label>
                <input type="checkbox" defaultChecked={checked} />
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
         * Unlike the node's renderHTML, uploads with probed dimensions
         * render through the Next.js image optimizer; the rest keep the
         * plain img.
         */
        image: ({ node }) => {
          const eager = isFirstImage;
          isFirstImage = false;
          return (
            <WikiContentImage
              attrs={node.attrs}
              imageDimensions={imageDimensions}
              eager={eager}
            />
          );
        },
        wikiFloatImage: ({ node }) => {
          const eager = isFirstImage;
          isFirstImage = false;
          return (
            <WikiContentImage
              attrs={node.attrs}
              imageDimensions={imageDimensions}
              eager={eager}
              floating
            />
          );
        },
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
            style={wikiBlockLayoutStyle(node.attrs)}
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
            style={wikiBlockLayoutStyle(node.attrs)}
          />
        ),
        /**
         * Renders the members pre-resolved by the server for this viewer
         * (see resolveWikiRoleCitizens) instead of the node's placeholder.
         */
        wikiRoleCitizens: ({ node }) => {
          const { roleId } = normalizeWikiRoleCitizensConfig(node.attrs);
          return (
            <WikiRoleCitizensList
              roleId={roleId}
              citizens={(roleId && roleCitizens[roleId]) || []}
              style={wikiBlockLayoutStyle(node.attrs)}
            />
          );
        },
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
  /**
   * Resolved members of the role-member nodes on this page, keyed by role
   * id
   */
  readonly roleCitizens?: Readonly<Record<string, readonly WikiRoleCitizen[]>>;
  /**
   * Intrinsic dimensions of the content's uploaded images, keyed by upload
   * id — images without an entry render as a plain img
   */
  readonly imageDimensions?: Readonly<Record<string, WikiImageDimensions>>;
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
  roleCitizens = {},
  imageDimensions = {},
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
    withoutWikiTrailingEmptyParagraph(content),
    iframeAllowlist,
    linkablePages,
    mentionedCitizens,
    linkedVariants,
    pageIndexes,
    roleCitizens,
    imageDimensions,
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
