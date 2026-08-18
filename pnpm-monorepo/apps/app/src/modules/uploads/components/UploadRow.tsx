import { TRow, TableRowAlignment } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import { formatWikiAttachmentSize } from "@sam-monorepo/wiki-editor";
import clsx from "clsx";
import type { getUploads } from "../queries/getUploads";
import { decodeUploadFileName } from "../utils/decodeUploadFileName";
import { getUploadUsages } from "../utils/uploadUsage";
import { DeleteUploadButton } from "./DeleteUploadButton";
import { UploadLocations } from "./UploadLocations";
import { UploadPreview } from "./UploadPreview";

const UNKNOWN = "Unbekannt";

type Upload = Awaited<ReturnType<typeof getUploads>>["uploads"][number];

interface Props {
  readonly upload: Upload;
  /** Renders the author and actions columns, which only managers have. */
  readonly canManage: boolean;
}

export const UploadRow = ({ upload, canManage }: Props) => {
  const fileName = decodeUploadFileName(upload.fileName);
  const author = upload.createdBy.name ?? upload.createdBy.id;
  const usages = getUploadUsages(upload);

  return (
    <TRow alignment={TableRowAlignment.Top} className="py-2">
      <td>
        <UploadPreview uploadId={upload.id} mimeType={upload.mimeType} />
      </td>

      <td className="min-w-0">
        <span className="block truncate" title={fileName}>
          {fileName}
        </span>

        <span
          className="block truncate font-mono text-xs text-neutral-500"
          title={upload.mimeType}
        >
          {upload.mimeType}
        </span>
      </td>

      <td className={clsx({ "text-neutral-500": upload.size === null })}>
        {upload.size === null ? UNKNOWN : formatWikiAttachmentSize(upload.size)}
      </td>

      <td>{formatDate(upload.createdAt)}</td>

      <td className="min-w-0">
        <UploadLocations usages={usages} />
      </td>

      {canManage && (
        <>
          <td className="min-w-0">
            <span className="block truncate" title={author}>
              {author}
            </span>
          </td>

          <td>
            <DeleteUploadButton
              uploadId={upload.id}
              fileName={fileName}
              usages={usages}
            />
          </td>
        </>
      )}
    </TRow>
  );
};
