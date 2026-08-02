"use client";

import {
  formatWikiAttachmentSize,
  WikiAttachment,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { CSSProperties } from "react";
import { ReportWikiAttachmentModal } from "./ReportWikiAttachmentModal";
import { wikiBlockLayoutStyle } from "./wikiBlockLayoutStyle";

interface CardProps {
  readonly uploadId: string;
  readonly fileName: string;
  readonly size: number | null;
  readonly mimeType: string | null;
  /** Page containing the attachment — without it the report button is omitted */
  readonly pageId?: string;
  /** The node's width/position styles (wikiBlockLayoutStyle) */
  readonly style?: CSSProperties;
}

/**
 * The download card plus the report button next to it. The button must not
 * live inside the download link, so a wrapper carries both (positioning:
 * wikiEditor.css, [data-wiki-attachment-card]). The anchor mirrors the
 * node's renderHTML incl. the data attributes, so copying the card from
 * the read view pastes back into the editor as an attachment node.
 */
const WikiAttachmentCardContent = ({
  uploadId,
  fileName,
  size,
  mimeType,
  pageId,
}: Omit<CardProps, "style">) => (
  <>
    <a
      data-wiki-attachment=""
      data-upload-id={uploadId}
      data-file-name={fileName}
      data-size={size ?? undefined}
      data-mime-type={mimeType ?? undefined}
      href={`/api/wiki/attachment/${encodeURIComponent(uploadId)}`}
    >
      <span data-wiki-attachment-name="">{fileName}</span>
      <span data-wiki-attachment-size="">{formatWikiAttachmentSize(size)}</span>
    </a>

    {pageId && uploadId && (
      <ReportWikiAttachmentModal
        pageId={pageId}
        uploadId={uploadId}
        fileName={fileName}
      />
    )}
  </>
);

/** Static render of an attachment card (readers' first paint). */
export const WikiAttachmentCard = ({ style, ...props }: CardProps) => (
  <div data-wiki-attachment-card="" style={style}>
    <WikiAttachmentCardContent {...props} />
  </div>
);

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
