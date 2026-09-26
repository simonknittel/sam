"use client";

import { WikiAttachment } from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { WikiAttachmentCardContent } from "./WikiAttachmentCard";
import { wikiBlockLayoutStyle } from "./wikiBlockLayoutStyle";

const WikiAttachmentNodeView = ({ node, extension }: NodeViewProps) => {
  const { pageId } = extension.options as { pageId: string };

  return (
    <NodeViewWrapper
      data-wiki-attachment-card=""
      style={wikiBlockLayoutStyle(node.attrs)}
    >
      <WikiAttachmentCardContent
        uploadId={String(node.attrs.uploadId ?? "")}
        fileName={String(node.attrs.fileName ?? "")}
        size={(node.attrs.size as number | null) ?? null}
        mimeType={(node.attrs.mimeType as string | null) ?? null}
        pageId={pageId}
      />
    </NodeViewWrapper>
  );
};

/**
 * The shared package's attachment node plus a React node view adding the
 * report button. Same name, attributes and schema — only the in-editor
 * rendering differs. Used for the read-only live collab view; while
 * editing, the plain node keeps its native drag/selection behavior.
 */
const WikiAttachmentWithReportButton = WikiAttachment.extend<{
  pageId: string;
}>({
  addOptions() {
    return { pageId: "" };
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiAttachmentNodeView);
  },
});

/**
 * Swaps the plain attachment node in an extension list for the
 * report-button variant, keeping its position in the list.
 */
export const withWikiAttachmentReportButton = (
  extensions: AnyExtension[],
  pageId: string,
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiAttachment.name
      ? WikiAttachmentWithReportButton.configure({ pageId })
      : extension,
  );
