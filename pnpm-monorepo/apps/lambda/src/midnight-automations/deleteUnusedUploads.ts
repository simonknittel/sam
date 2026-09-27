import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { prisma } from "@sam-monorepo/database";
import { AuditEventType, UNUSED_UPLOAD_WHERE } from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";
import { env } from "./setup";

/**
 * Uploads are created in the database before the browser PUTs the file and
 * assigns it to its resource, so recent uploads may not be referenced
 * anywhere yet. Rows and objects younger than this are never touched.
 */
const GRACE_PERIOD_HOURS = 24;

/** DeleteObjects accepts at most 1000 keys per request. */
const DELETE_BATCH_SIZE = 1000;

/**
 * Deletes uploads which are no longer used anywhere, from both the database
 * and the S3 bucket. Replacing an upload (e.g. a role icon) only rewires the
 * foreign key and deleting a resource only nulls it, so the previous upload
 * would otherwise be left behind forever.
 *
 * The rule of upload usage is in `UPLOAD_USAGE_RELATIONS`
 * (packages/domain/src/uploadUsageRelations.ts).
 *
 * Afterwards the bucket is swept for objects without an Upload row, which
 * the database cannot find: for example the object of an upload whose
 * deletion in the upload manager failed at the bucket. This also removes the
 * objects of the rows deleted above.
 */
export const deleteUnusedUploads = async () => {
  await captureAsyncFunc("deleteUnusedUploads", async () => {
    const {
      S3_ACCOUNT_ID: accountId,
      S3_ACCESS_KEY_ID: accessKeyId,
      S3_SECRET_ACCESS_KEY: secretAccessKey,
      S3_BUCKET_NAME: bucketName,
    } = env;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      log.warn(
        "Skipping deleteUnusedUploads since the S3 parameters are not configured",
      );
      return;
    }

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - GRACE_PERIOD_HOURS);

    const { count: databaseCount } = await captureAsyncFunc(
      "delete unused uploads from the database",
      () =>
        prisma.upload.deleteMany({
          where: {
            createdAt: { lt: cutoff },
            ...UNUSED_UPLOAD_WHERE,
          },
        }),
    );

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const objects = await captureAsyncFunc("list bucket objects", async () => {
      const result: { key: string; lastModified?: Date }[] = [];
      let continuationToken: string | undefined;

      do {
        const response = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
          }),
        );

        for (const object of response.Contents ?? []) {
          if (!object.Key) continue;
          result.push({ key: object.Key, lastModified: object.LastModified });
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return result;
    });

    const remainingUploads = await captureAsyncFunc(
      "find remaining uploads",
      () => prisma.upload.findMany({ select: { id: true } }),
    );
    const remainingIds = new Set(remainingUploads.map((upload) => upload.id));

    const orphanedKeys = objects
      .filter(
        (object) =>
          !remainingIds.has(object.key) &&
          object.lastModified !== undefined &&
          object.lastModified < cutoff,
      )
      .map((object) => object.key);

    if (orphanedKeys.length > 0) {
      await captureAsyncFunc("delete objects from the bucket", async () => {
        for (
          let offset = 0;
          offset < orphanedKeys.length;
          offset += DELETE_BATCH_SIZE
        ) {
          const response = await s3.send(
            new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: {
                Objects: orphanedKeys
                  .slice(offset, offset + DELETE_BATCH_SIZE)
                  .map((key) => ({ Key: key })),
                Quiet: true,
              },
            }),
          );

          if (response.Errors && response.Errors.length > 0)
            log.warn("Failed to delete some objects from the bucket", {
              errors: response.Errors,
            });
        }
      });
    }

    if (databaseCount > 0 || orphanedKeys.length > 0) {
      log.info("Deleted unused uploads", {
        databaseCount,
        bucketCount: orphanedKeys.length,
      });

      await createAuditEvents([
        {
          type: AuditEventType.UNUSED_UPLOADS_DELETED,
          data: {
            databaseCount,
            bucketCount: orphanedKeys.length,
          },
        },
      ]);
    }
  });
};
