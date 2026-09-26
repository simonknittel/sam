import { mergeAttributes, Node } from "@tiptap/core";
import { formatWikiAttachmentSize } from "./formatWikiAttachmentSize.js";
import { walkWikiContent } from "./walkWikiContent.js";
import {
  wikiAlignAttribute,
  wikiWidthPxAttribute,
} from "./wikiResizableNodes.js";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiAttachment: {
      /** Inserts a file attachment card at the current position */
      setWikiAttachment: (attributes: {
        uploadId: string;
        fileName: string;
        size: number | null;
        mimeType: string | null;
      }) => ReturnType;
    };
  }
}

/**
 * Collects the upload ids of all attachment cards in a Tiptap JSON
 * document. Used to keep the page ⇄ upload links in sync with the persisted
 * content (e.g. after an attachment was copy-pasted from another page).
 */
export const collectWikiAttachmentUploadIds = (content: unknown): string[] => {
  const uploadIds = new Set<string>();

  walkWikiContent(content, (node) => {
    if (
      node.type === "wikiAttachment" &&
      typeof node.attrs?.uploadId === "string" &&
      node.attrs.uploadId.length > 0
    )
      uploadIds.add(node.attrs.uploadId);
  });

  return [...uploadIds];
};

/**
 * A non-image file attachment rendered as a downloadable card. The href
 * points at the app's permission-checked download route which redirects to
 * a short-lived presigned URL — the file itself is not public.
 */
export const WikiAttachment = Node.create({
  name: "wikiAttachment",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...wikiWidthPxAttribute(),
      ...wikiAlignAttribute(),
      uploadId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-upload-id"),
        renderHTML: (attributes) =>
          attributes.uploadId === null
            ? {}
            : { "data-upload-id": String(attributes.uploadId) },
      },
      fileName: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-file-name") ?? "",
        renderHTML: (attributes) =>
          attributes.fileName === null
            ? {}
            : { "data-file-name": String(attributes.fileName) },
      },
      size: {
        default: null,
        parseHTML: (element) => {
          const parsed = Number(element.getAttribute("data-size"));
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
        },
        renderHTML: (attributes) =>
          attributes.size === null
            ? {}
            : { "data-size": String(attributes.size) },
      },
      mimeType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mime-type"),
        renderHTML: (attributes) =>
          attributes.mimeType === null
            ? {}
            : { "data-mime-type": String(attributes.mimeType) },
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-wiki-attachment]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const uploadId = String(node.attrs.uploadId ?? "");
    const fileName = String(node.attrs.fileName ?? "");
    const size = node.attrs.size as number | null;

    return [
      "a",
      mergeAttributes(
        {
          "data-wiki-attachment": "",
          href: `/api/wiki/attachment/${encodeURIComponent(uploadId)}`,
        },
        HTMLAttributes,
      ),
      ["span", { "data-wiki-attachment-name": "" }, fileName],
      [
        "span",
        { "data-wiki-attachment-size": "" },
        formatWikiAttachmentSize(size),
      ],
    ];
  },

  addCommands() {
    return {
      setWikiAttachment:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },
});
