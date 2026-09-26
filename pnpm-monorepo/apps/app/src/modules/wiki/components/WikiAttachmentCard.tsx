import { formatWikiAttachmentSize } from "@sam-monorepo/wiki-editor/helpers";
import type { CSSProperties } from "react";
import { ReportWikiAttachmentModal } from "./ReportWikiAttachmentModal";

interface ContentProps {
  readonly uploadId: string;
  readonly fileName: string;
  readonly size: number | null;
  readonly mimeType: string | null;
  /** Page containing the attachment — without it the report button is omitted */
  readonly pageId?: string;
}

/**
 * The download card plus the report button next to it. The button must not
 * live inside the download link, so a wrapper carries both (positioning:
 * wikiEditor.css, [data-wiki-attachment-card]). The anchor mirrors the
 * node's renderHTML incl. the data attributes, so copying the card from
 * the read view pastes back into the editor as an attachment node. Shared
 * with the editor node view (WikiAttachmentNodeView), which supplies its
 * own wrapper.
 */
export const WikiAttachmentCardContent = ({
  uploadId,
  fileName,
  size,
  mimeType,
  pageId,
}: ContentProps) => (
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

interface Props extends ContentProps {
  /** The node's width/position styles (wikiBlockLayoutStyle) */
  readonly style?: CSSProperties;
}

/**
 * Static render of an attachment card (readers' first paint). Loads no
 * editor code, so pages that only show static content stay small.
 */
export const WikiAttachmentCard = ({ style, ...props }: Props) => (
  <div data-wiki-attachment-card="" style={style}>
    <WikiAttachmentCardContent {...props} />
  </div>
);
