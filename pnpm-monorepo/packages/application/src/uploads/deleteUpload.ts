import {
  AuditEventType,
  decodeUploadFileName,
  listUploadUsages,
  UPLOAD_USAGE_TYPE_LABELS,
  type UploadUsageLocation,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { UploadErrorMessage } from "./uploadErrors.js";
import { UPLOAD_USAGE_SELECT } from "./uploadUsageSelect.js";

/**
 * The locations in the audit event. An upload in hundreds of wiki pages
 * would write a very large entry. The count of the locations stays exact.
 */
const MAXIMUM_AUDITED_UPLOAD_LOCATIONS = 20;

export const deleteUploadInputSchema = z.object({
  upload_id: idSchema,
});

export type DeleteUploadInput = z.infer<typeof deleteUploadInputSchema>;

export interface DeleteUploadOutput {
  readonly upload_id: string;
  /**
   * False when the object stays in the bucket: the nightly sweep deletes
   * it later
   */
  readonly object_deleted: boolean;
}

/** "<usage type>: <label>" for each location, at most the limit and a rest */
const toAuditedLocations = (
  usages: readonly UploadUsageLocation[],
): string[] => {
  const locations = usages
    .slice(0, MAXIMUM_AUDITED_UPLOAD_LOCATIONS)
    .map((usage) => `${UPLOAD_USAGE_TYPE_LABELS[usage.type]}: ${usage.label}`);
  if (usages.length > locations.length)
    locations.push(`… und ${usages.length - locations.length} weitere`);

  return locations;
};

/**
 * Deletes the object from the bucket. A failure leaves the object for the
 * nightly sweep, thus it gives false and does not throw.
 */
const deleteObject = async (
  context: ApplicationContext,
  uploadId: string,
): Promise<boolean> => {
  if (!context.storage) {
    context.log.warn("Failed to delete an upload's object from the bucket", {
      uploadId,
      reason: UploadErrorMessage.StorageNotConfigured,
    });
    return false;
  }

  try {
    const { failures } = await context.storage.deleteObjects([uploadId]);
    if (failures.length === 0) return true;

    context.log.warn("Failed to delete an upload's object from the bucket", {
      uploadId,
      failures,
    });
  } catch (error) {
    context.log.warn("Failed to delete an upload's object from the bucket", {
      uploadId,
      error,
    });
  }

  return false;
};

/**
 * Deletes an upload, also when it is still in use. The content of a wiki
 * page keeps its reference, which shows nothing after the delete. The audit
 * event names the places that used the upload.
 *
 * @throws ForbiddenError when the actor does not have `upload;manage`
 * @throws NotFoundError `UploadErrorMessage.UploadNotFound`, also when a
 * different user deleted the upload first
 */
export const deleteUpload = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteUploadInput,
): Promise<DeleteUploadOutput> =>
  withSpan(context, "deleteUpload", async () => {
    requirePermission(actor, "upload", "manage");

    const upload = await context.prisma.upload.findUnique({
      where: { id: input.upload_id },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        createdBy: { select: { userId: true } },
        ...UPLOAD_USAGE_SELECT,
      },
    });
    if (!upload) throw new NotFoundError(UploadErrorMessage.UploadNotFound);

    const locations = toAuditedLocations(listUploadUsages(upload));

    /**
     * The row goes first: its foreign keys are `SetNull` and its join rows go
     * with it, thus the references are gone in all cases. When the delete of
     * the object fails, the nightly sweep of the bucket deletes the object
     * without a row. Thus the failure is only logged.
     */
    await rethrowRecordNotFound(
      () =>
        context.prisma.upload.delete({
          where: { id: upload.id },
          select: { id: true },
        }),
      UploadErrorMessage.UploadNotFound,
    );

    const objectDeleted = await deleteObject(context, upload.id);

    await context.audit.create([
      {
        type: AuditEventType.UPLOAD_DELETED_V2,
        data: {
          uploadId: upload.id,
          fileName: decodeUploadFileName(upload.fileName),
          mimeType: upload.mimeType,
          /**
           * The payload of this version holds the user of the author. The
           * author of an upload is a citizen now, thus the user comes
           * through the citizen.
           */
          uploadedById: upload.createdBy?.userId ?? null,
          locations,
        },
        createdById: actor.userId,
      },
    ]);

    return { upload_id: upload.id, object_deleted: objectDeleted };
  });
