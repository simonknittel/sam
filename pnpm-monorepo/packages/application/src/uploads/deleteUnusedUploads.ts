import { AuditEventType, UNUSED_UPLOAD_WHERE } from "@sam-monorepo/domain";
import {
  MAXIMUM_STORAGE_DELETE_KEYS,
  type ApplicationContext,
} from "../context.js";
import { withSpan } from "../withSpan.js";

/**
 * The app creates the row of an upload before the browser sends the file
 * with PUT and assigns the upload to its resource. Thus a new upload is
 * possibly not referenced yet. The sweep never touches rows and objects that
 * are younger than this.
 */
const UNUSED_UPLOAD_GRACE_PERIOD_HOURS = 24;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export interface DeleteUnusedUploadsOutput {
  /** False when the host has no bucket: then the sweep did nothing */
  readonly storageConfigured: boolean;
  readonly databaseCount: number;
  /** The objects that the bucket deleted */
  readonly bucketCount: number;
}

/**
 * Deletes the uploads that nothing uses, from the database and from the
 * bucket. A new upload (for example a new role icon) only changes the
 * foreign key, and the delete of a resource does not delete its uploads.
 * Without the sweep, the previous upload would stay forever.
 *
 * The rule of the upload usage is `UPLOAD_USAGE_RELATION_BY_TYPE` of the
 * domain package.
 *
 * Then the sweep deletes the objects of the bucket without a row, which the
 * database cannot find: for example the object of an upload whose delete in
 * the upload manager failed at the bucket. This also deletes the objects of
 * the rows that the first step deleted.
 *
 * A failure of the bucket fails the run after the audit event of the deleted
 * rows and objects.
 */
export const deleteUnusedUploads = (
  context: ApplicationContext,
): Promise<DeleteUnusedUploadsOutput> =>
  withSpan(context, "deleteUnusedUploads", async () => {
    const { storage } = context;
    if (!storage) {
      context.log.warn(
        "Skipping deleteUnusedUploads since the S3 parameters are not configured",
      );
      return { storageConfigured: false, databaseCount: 0, bucketCount: 0 };
    }

    const cutoff = new Date(
      context.now().getTime() -
        UNUSED_UPLOAD_GRACE_PERIOD_HOURS * MILLISECONDS_PER_HOUR,
    );

    const { count: databaseCount } = await context.prisma.upload.deleteMany({
      where: { createdAt: { lt: cutoff }, ...UNUSED_UPLOAD_WHERE },
    });

    /** The objects that the bucket deleted, also when a later batch fails */
    let bucketCount = 0;

    try {
      const objects = await storage.listObjects();

      const remainingUploads = await context.prisma.upload.findMany({
        select: { id: true },
      });
      const remainingIds = new Set(remainingUploads.map((upload) => upload.id));

      const orphanedKeys = objects
        .filter(
          (object) =>
            object.lastModified < cutoff && !remainingIds.has(object.key),
        )
        .map((object) => object.key);

      for (
        let offset = 0;
        offset < orphanedKeys.length;
        offset += MAXIMUM_STORAGE_DELETE_KEYS
      ) {
        const batch = orphanedKeys.slice(
          offset,
          offset + MAXIMUM_STORAGE_DELETE_KEYS,
        );

        const { failures } = await storage.deleteObjects(batch);
        bucketCount += batch.length - failures.length;

        if (failures.length > 0)
          context.log.warn("Failed to delete some objects from the bucket", {
            failures,
          });
      }
    } finally {
      // Also when the bucket fails: the rows are deleted already
      if (databaseCount > 0 || bucketCount > 0)
        await context.audit.create([
          {
            type: AuditEventType.UNUSED_UPLOADS_DELETED,
            data: { databaseCount, bucketCount },
            createdById: null,
          },
        ]);
    }

    return { storageConfigured: true, databaseCount, bucketCount };
  });
