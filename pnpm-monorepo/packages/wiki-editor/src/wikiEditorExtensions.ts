import { getSchema } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import type { Schema } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { WikiAttachment } from "./wikiAttachmentNode.js";
import { WikiCallout } from "./wikiCalloutNode.js";
import {
  WikiCitizenMention,
  type WikiMentionedCitizen,
} from "./wikiCitizenMentionNode.js";
import { WikiEmbed } from "./wikiEmbedNode.js";
import { WikiGrid, WikiGridCell } from "./wikiGridNodes.js";
import { WikiHeadingIds } from "./wikiHeadingIds.js";
import { WikiIframe } from "./wikiIframeNode.js";
import { WikiPageLink, type WikiPageLinkedPage } from "./wikiPageLinkNode.js";
import { WikiImage, WikiYoutube } from "./wikiResizableNodes.js";

export interface WikiEditorExtensionsOptions {
  /** Undo/redo comes from Yjs in the collab editor instead of StarterKit */
  collaboration?: boolean;
  /**
   * Hostname of the app (without scheme/port), required by Twitch's player
   * as its `parent` query parameter. Only affects rendering, not the
   * schema.
   */
  twitchParentHost?: string;
  /**
   * Hostnames generic iframes may embed (from the wiki settings). Only
   * affects rendering, not the schema — unlisted hosts render a blocked
   * placeholder.
   */
  iframeAllowlist?: readonly string[];
  /**
   * Pages the current viewer can see, by id — resolves internal page
   * links' labels and hrefs at render time. Only affects rendering, not
   * the schema.
   */
  pages?: Readonly<Record<string, WikiPageLinkedPage>>;
  /**
   * Current handles of the citizens mentioned on the page, by id — resolves
   * citizen mentions' labels at render time. Only affects rendering, not
   * the schema.
   */
  citizens?: Readonly<Record<string, WikiMentionedCitizen>>;
}

/**
 * Shared lowlight instance — a static grammar registry, so one instance can
 * serve every editor. `common` (~35 grammars) instead of `all` keeps ~150
 * unused grammars out of the client bundle.
 */
const lowlight = createLowlight(common);

/**
 * The wiki's Tiptap extensions. Shared between the editor, the static
 * renderer for readers and the server-side content validation so all three
 * always agree on the schema. All options only affect editor behavior or
 * rendering — never the schema itself.
 */
export const getWikiEditorExtensions = (
  options?: WikiEditorExtensionsOptions,
) => {
  return [
    StarterKit.configure({
      // Replaced with the lowlight-highlighted variant below
      codeBlock: false,
      link: {
        openOnClick: false,
      },
      undoRedo: options?.collaboration ? false : undefined,
      dropcursor: {
        // Line color; the glow gradient comes from the class (wikiEditor.css)
        color: "var(--color-green-500)",
        width: 2,
        class: "wiki-drop-cursor",
      },
    }),
    CodeBlockLowlight.configure({ lowlight }),
    TableKit.configure({
      table: { resizable: false },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Details,
    DetailsSummary,
    DetailsContent,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    WikiImage,
    WikiAttachment,
    WikiYoutube.configure({
      nocookie: true,
    }),
    WikiEmbed.configure({
      twitchParentHost: options?.twitchParentHost ?? "",
    }),
    WikiIframe.configure({
      allowlist: options?.iframeAllowlist ?? [],
    }),
    WikiPageLink.configure({
      pages: options?.pages ?? {},
    }),
    WikiCitizenMention.configure({
      citizens: options?.citizens ?? {},
    }),
    WikiGrid,
    WikiGridCell,
    WikiCallout,
    WikiHeadingIds,
    Placeholder.configure({
      placeholder: "Schreibe etwas …",
    }),
  ];
};

/**
 * The ProseMirror schema derived from the wiki's extensions, e.g. for
 * validating content server-side or converting between Yjs and ProseMirror
 * documents.
 */
export const getWikiEditorSchema = (): Schema =>
  getSchema(getWikiEditorExtensions());
