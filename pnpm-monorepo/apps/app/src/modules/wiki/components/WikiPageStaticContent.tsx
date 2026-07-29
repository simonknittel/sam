import {
  createWikiHeadingIdAssigner,
  getWikiEditorExtensions,
  resolveWikiCitizenMention,
  type WikiMentionedCitizen,
  type WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import { renderToReactElement } from "@tiptap/static-renderer";
import clsx from "clsx";
import { createElement, type ReactNode } from "react";
import { getWikiTwitchParentHost } from "../utils/getWikiTwitchParentHost";
import { WikiCitizenMentionChip } from "./WikiCitizenMentionNodeView";
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
}: Props) => {
  if (!content)
    return (
      <p className={clsx("text-neutral-400", className)}>
        Diese Seite hat noch keinen Inhalt.
      </p>
    );

  const rendered = renderWikiPageContent(
    content,
    iframeAllowlist,
    linkablePages,
    mentionedCitizens,
  );

  return (
    <div className={clsx("prose prose-invert max-w-none", className)}>
      {rendered}
    </div>
  );
};
