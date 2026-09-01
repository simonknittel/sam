import { env } from "@/env";
import { createS3Client } from "@/modules/common/utils/createS3Client";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import type { Prisma, Upload, User } from "@sam-monorepo/database/client";

/** Same bound the dimension probe uses for its S3 requests */
const S3_REQUEST_TIMEOUT_MS = 30_000;

/** Everything a copy needs from its source row */
export type CopyableUpload = Pick<
  Upload,
  "id" | "fileName" | "mimeType" | "size" | "width" | "height"
>;

/** Loads exactly a `CopyableUpload`, so the two can never drift apart */
export const COPYABLE_UPLOAD_SELECT = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
} as const satisfies Prisma.UploadSelect;

/**
 * Duplicates an upload: a new `Upload` row owned by the acting user plus a
 * copy of the stored object under the new row's id, which is the S3 key.
 * The probed dimensions carry over — the bytes are identical, so re-probing
 * would only cost another round trip.
 *
 * Used where a reference would be wrong: an event created from a template
 * gets its own cover, so editing or deleting one never touches the other and
 * the upload manager accounts for both independently.
 *
 * The source key is always derived server-side from a row the caller already
 * resolved, never from user input. Runs on the caller's transaction so a
 * failed surrounding operation leaves no orphaned row; the object copy
 * itself cannot be rolled back, but an object without a row is exactly what
 * the nightly upload cleanup removes.
 */
export const copyUpload = async (
  transaction: Prisma.TransactionClient,
  source: CopyableUpload,
  createdById: User["id"],
): Promise<Upload> => {
  const copy = await transaction.upload.create({
    data: {
      fileName: source.fileName,
      mimeType: source.mimeType,
      size: source.size,
      width: source.width,
      height: source.height,
      createdById,
    },
  });

  await createS3Client().send(
    new CopyObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      CopySource: `${env.S3_BUCKET_NAME}/${source.id}`,
      Key: copy.id,
      ContentType: source.mimeType,
      MetadataDirective: "REPLACE",
    }),
    { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) },
  );

  return copy;
};
