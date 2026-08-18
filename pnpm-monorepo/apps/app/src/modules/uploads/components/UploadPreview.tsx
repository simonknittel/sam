import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import Image from "next/image";
import { FaFileLines } from "react-icons/fa6";

/** Rendered size of the thumbnail, matching the `size-10` box below. */
const PREVIEW_SIZE = 40;

/**
 * Formats the optimizer cannot resize (animated GIF) or must not process
 * (SVG, rejected at upload but present on legacy rows) — same list the
 * other upload surfaces use.
 */
const UNOPTIMIZED_MIME_TYPES: readonly string[] = [
  "image/svg+xml",
  "image/gif",
];

interface Props {
  readonly uploadId: string;
  readonly mimeType: string;
}

/**
 * A thumbnail for image uploads, a generic file icon for everything else.
 * Decorative on purpose — the row's file name column names the upload.
 */
export const UploadPreview = ({ uploadId, mimeType }: Props) => {
  if (!mimeType.startsWith("image/"))
    return (
      <span
        title={mimeType}
        className="flex size-10 items-center justify-center rounded-secondary bg-tertiary text-neutral-400"
      >
        <FaFileLines />
      </span>
    );

  return (
    <Image
      src={getPublicUploadUrl(uploadId)}
      alt=""
      width={PREVIEW_SIZE}
      height={PREVIEW_SIZE}
      className="size-10 rounded-secondary bg-tertiary object-contain"
      unoptimized={UNOPTIMIZED_MIME_TYPES.includes(mimeType)}
    />
  );
};
