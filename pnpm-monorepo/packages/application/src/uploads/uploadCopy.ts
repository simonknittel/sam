import type { Prisma, Upload } from "@sam-monorepo/database/client";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { UploadErrorMessage } from "./uploadErrors.js";

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
 * Duplicates an upload: a new `Upload` row owned by the acting citizen plus a
 * copy of the stored object under the new row's id, which is the storage
 * key. The probed dimensions carry over — the bytes are identical, so
 * re-probing would only cost another round trip.
 *
 * Used where a reference would be wrong: for example, an event created from a
 * template gets its own cover, so editing or deleting one never touches the
 * other and the upload manager accounts for both independently.
 *
 * The source key is always derived server-side from a row the caller already
 * resolved, never from user input. Runs on the caller's transaction so a
 * failed surrounding operation leaves no orphaned row; the object copy
 * itself cannot be rolled back, but an object without a row is exactly what
 * the nightly upload cleanup removes.
 *
 * @throws ConflictError `UploadErrorMessage.StorageNotConfigured`
 */
export const copyUploadInTransaction = async (
  context: Pick<ApplicationContext, "storage">,
  transaction: Prisma.TransactionClient,
  source: CopyableUpload,
  createdById: string | null,
): Promise<{ readonly id: string }> => {
  if (!context.storage)
    throw new ConflictError(UploadErrorMessage.StorageNotConfigured);

  const copy = await transaction.upload.create({
    data: {
      fileName: source.fileName,
      mimeType: source.mimeType,
      size: source.size,
      width: source.width,
      height: source.height,
      createdById,
    },
    select: { id: true },
  });

  await context.storage.copyObject({
    sourceKey: source.id,
    targetKey: copy.id,
    contentType: source.mimeType,
  });

  return copy;
};
