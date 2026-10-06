import {
  DeleteObjectsCommand,
  paginateListObjectsV2,
  S3Client,
  type ListObjectsV2CommandOutput,
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
 * Without timeouts, a bucket that does not answer stops the job until the
 * function times out. A DeleteObjects request with 1000 keys can take longer
 * than a usual request, thus the request timeout is longer.
 */
const CONNECTION_TIMEOUT_MILLISECONDS = 5_000;
const REQUEST_TIMEOUT_MILLISECONDS = 10_000;

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

    /** The objects that the bucket deleted, also when a later request fails */
    let bucketCount = 0;

    try {
      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        requestHandler: {
          connectionTimeout: CONNECTION_TIMEOUT_MILLISECONDS,
          requestTimeout: REQUEST_TIMEOUT_MILLISECONDS,
          /** Without it, the SDK only logs a warning after the timeout */
          throwOnRequestTimeout: true,
        },
      });

      const pages = await captureAsyncFunc("list bucket objects", async () => {
        const result: ListObjectsV2CommandOutput[] = [];
        for await (const page of paginateListObjectsV2(
          { client: s3 },
          { Bucket: bucketName },
        )) {
          result.push(page);
        }
        return result;
      });

      const remainingUploads = await captureAsyncFunc(
        "find remaining uploads",
        () => prisma.upload.findMany({ select: { id: true } }),
      );
      const remainingIds = new Set(remainingUploads.map((upload) => upload.id));

      const orphanedKeys = pages
        .flatMap((page) => page.Contents ?? [])
        .filter(
          (object) =>
            object.LastModified !== undefined && object.LastModified < cutoff,
        )
        .map((object) => object.Key)
        .filter((key) => key !== undefined)
        .filter((key) => !remainingIds.has(key));

      if (orphanedKeys.length > 0) {
        await captureAsyncFunc("delete objects from the bucket", async () => {
          for (
            let offset = 0;
            offset < orphanedKeys.length;
            offset += DELETE_BATCH_SIZE
          ) {
            const batch = orphanedKeys.slice(
              offset,
              offset + DELETE_BATCH_SIZE,
            );

            const response = await s3.send(
              new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: {
                  Objects: batch.map((key) => ({ Key: key })),
                  /** The response contains only the keys that failed */
                  Quiet: true,
                },
              }),
            );

            const errors = response.Errors ?? [];
            bucketCount += batch.length - errors.length;

            if (errors.length > 0)
              log.warn("Failed to delete some objects from the bucket", {
                errors,
              });
          }
        });
      }
    } finally {
      /** Also when the bucket fails: the rows are deleted already */
      if (databaseCount > 0 || bucketCount > 0) {
        log.info("Deleted unused uploads", {
          databaseCount,
          bucketCount,
        });

        await createAuditEvents([
          {
            type: AuditEventType.UNUSED_UPLOADS_DELETED,
            data: {
              databaseCount,
              bucketCount,
            },
          },
        ]);
      }
    }
  });
};
