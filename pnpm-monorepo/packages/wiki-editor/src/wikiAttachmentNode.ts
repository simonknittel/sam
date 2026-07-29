import { mergeAttributes, Node } from "@tiptap/core";

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
 * Formats a byte count for the attachment card, e.g. "1,2 MB".
 */
export const formatWikiAttachmentSize = (size: number | null): string => {
  if (size === null || Number.isNaN(size)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: value >= 10 || unitIndex === 0 ? 0 : 1,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
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
